[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$ServerName,

  [Parameter(Mandatory = $false)]
  [string]$Environment = 'mel',

  [Parameter(Mandatory = $false)]
  [string]$Region = 'mel',

  [Parameter(Mandatory = $false)]
  [string]$Size = 'std-min',

  [Parameter(Mandatory = $false)]
  [string]$Image = 'ubuntu-22-04',

  [Parameter(Mandatory = $false)]
  [string]$SSHKeyName = 'word-game-deploy',

  [Parameter(Mandatory = $false)]
  [ValidateRange(1024, 65535)]
  [int]$SSHPort = 2023,

  [Parameter(Mandatory = $false)]
  [switch]$WaitForReady,

  [Parameter(Mandatory = $false)]
  [switch]$EnableIPv6,

  [Parameter(Mandatory = $false)]
  [int]$VpcId,

  [Parameter(Mandatory = $false)]
  [switch]$DisablePortBlocking,

  [Parameter(Mandatory = $false)]
  [hashtable]$ServerOptions,

  # TODO: Implement password option securely
  [Parameter(Mandatory = $false)]
  [string]$Password
)

# Configuration
$ProjectName = 'word-guessing-game'
$ScriptDir = $PSScriptRoot
$LogFile = Join-Path $ScriptDir "deployment-$(Get-Date -Format 'yyyy-MM-dd').log"

# Logging function
function Write-Log {
  param([string]$Message, [string]$Level = 'INFO')
  $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  $logEntry = "[$timestamp] [$Level] $Message"
  Write-Output $logEntry
  $logEntry | Out-File -FilePath $LogFile -Append -Encoding UTF8
}

# Check required environment variables
function Test-Prerequisites {
  Write-Log 'Checking prerequisites...'

  $requiredVars = @(
    'BINARYLANE_API_TOKEN',
    'GITHUB_REPO',
    'BASTION_HOST_IP'
  )

  $missing = @()
  foreach ($var in $requiredVars) {
    if (-not (Get-Variable -Name $var -Scope Global -ErrorAction SilentlyContinue)) {
      if (-not [Environment]::GetEnvironmentVariable($var)) {
        $missing += $var
      }
    }
  }

  if ($missing.Count -gt 0) {
    Write-Log "Missing required environment variables: $($missing -join ', ')" 'ERROR'
    Write-Log 'Please set these variables or use scripts/setup-secrets.sh'
    exit 1
  }

  Write-Log 'Prerequisites check passed'
}

# Create server configuration
function New-ServerConfig {
  $bastionHostIp = [Environment]::GetEnvironmentVariable('BASTION_HOST_IP')
  $githubRepo = [Environment]::GetEnvironmentVariable('GITHUB_REPO')

  $config = @{
    name      = "$ServerName-$Environment"
    region    = $Region
    size      = $Size
    image     = $Image
    ssh_keys  = @($SSHKeyName)
    user_data = Get-CloudInitScript -BastionHostIp $bastionHostIp `
      -GithubRepo $githubRepo -SshPort $SSHPort
    backups   = ($Environment -eq 'production')
  }

  # Optional parameters
  if ($EnableIPv6) {
    $config.ipv6 = $true
  }

  if ($VpcId) {
    $config.vpc_id = $VpcId
  }

  if ($DisablePortBlocking) {
    $config.port_blocking = $false
  }

  if ($ServerOptions) {
    $config.options = $ServerOptions
  }

  if ($Password) {
    $config.password = $Password
  }

  return $config | ConvertTo-Json -Depth 3
}

# Generate cloud-init script
function Get-CloudInitScript {
  param(
    [string]$BastionHostIp,
    [string]$GithubRepo,
    [int]   $SshPort
  )
  $rootDir = Split-Path $PSScriptRoot -Parent -Parent
  $templatePath = Join-Path $rootDir 'infrastructure\server\cloud-init-template.yml'

  if (-not (Test-Path $templatePath)) {
    throw "cloud-init template not found: $templatePath"
  }
  $template = Get-Content $templatePath -Raw

  $template = $template -replace '\$Environment', $Environment
  $template = $template -replace '\$SshPort', $SshPort
  $template = $template -replace '\$BastionHostIp', $BastionHostIp
  $template = $template -replace '\$GithubRepo', $GithubRepo

  return $template
}

# Create server via Binary Lane API
function New-BinaryLaneServer {
  param([string]$Config)

  Write-Log "Creating Binary Lane server: $ServerName-$Environment"

  $headers = @{
    'Authorization' = "Bearer $env:BINARYLANE_API_TOKEN"
    'Content-Type'  = 'application/json'
  }

  try {
    $response = Invoke-RestMethod -Uri 'https://api.binarylane.com.au/v2/servers' `
      -Method POST `
      -Headers $headers `
      -Body $Config

    Write-Log "Server created successfully. ID: $($response.server.id)"
    return $response.server
  } catch {
    Write-Log "Failed to create server: $($_.Exception.Message)" 'ERROR'
    throw
  }
}

# Wait for server to be ready
function Wait-ForServer {
  param([int]$ServerId)

  Write-Log 'Waiting for server to be ready...'

  $headers = @{
    'Authorization' = "Bearer $env:BINARYLANE_API_TOKEN"
  }

  $maxAttempts = 60
  $attempt = 0

  do {
    Start-Sleep 10
    $attempt++

    try {
      $response = Invoke-RestMethod -Uri "https://api.binarylane.com.au/v2/servers/$ServerId" `
        -Headers $headers

      $status = $response.server.status
      Write-Log "Server status: $status (attempt $attempt/$maxAttempts)"

      if ($status -eq 'active') {
        Write-Log 'Server is ready!'
        return $response.server
      }
    } catch {
      Write-Log "Error checking server status: $($_.Exception.Message)" 'WARN'
    }
  } while ($attempt -lt $maxAttempts)

  throw 'Server did not become ready within expected time'
}

# Update DNS records (placeholder)
function Update-DnsRecords {
  param([string]$IpAddress)

  Write-Log "DNS update required for IP: $IpAddress"
  Write-Log 'Please update your DNS records manually:'
  Write-Log "  A Record: $ServerName-$Environment.yourdomain.com -> $IpAddress"

  if ($Environment -eq 'production') {
    Write-Log "  A Record: yourdomain.com -> $IpAddress"
    Write-Log '  CNAME: www.yourdomain.com -> yourdomain.com'
  }
}

# Generate deployment summary
function Write-DeploymentSummary {
  param([object]$Server)

  $publicNetwork = $Server.networks.v4.Where({ $_.type -eq 'public' })
  $privateNetwork = $Server.networks.v4.Where({ $_.type -eq 'private' })

  $publicIp = if ($publicNetwork) { $publicNetwork[0].ip_address } else { 'N/A' }
  $privateIp = if ($privateNetwork) { $privateNetwork[0].ip_address } else { 'N/A' }

  $summary = @"

🎉 Deployment Summary
=====================

Server Details:
  Name: $($Server.name)
  ID: $($Server.id)
  Status: $($Server.status)
  IP Address: $publicIp
  Private IP: $privateIp
  Region: $($Server.region.name)
  SSH Port: $SSHPort

Next Steps:
  1. Update DNS records (see above)
  2. Wait for cloud-init to complete (~5-10 minutes)
  3. Test SSH access: ssh wordgame@$publicIp -p $SSHPort
  4. Check application: http://$publicIp:3000
  5. Configure SSL certificate with certbot

Monitoring:
  Server logs: tail -f /var/log/word-guessing-game-setup.log
  Service status: systemctl status word-guessing-game

For troubleshooting, see: infrastructure/server/setup-linux-vm.md
"@

  Write-Log $summary
}

# Main execution
try {
  Write-Log 'Starting Binary Lane server provisioning'
  Write-Log "Server: $ServerName, Environment: $Environment, SSH Port: $SSHPort"

  Test-Prerequisites

  $config = New-ServerConfig
  Write-Log 'Server configuration prepared'

  $server = New-BinaryLaneServer -Config $config

  if ($WaitForReady) {
    $server = Wait-ForServer -ServerId $server.id
  }

  $publicNetwork = $server.networks.v4.Where({ $_.type -eq 'public' })
  $publicIp = if ($publicNetwork) { $publicNetwork[0].ip_address } else { 'N/A' }

  if ($publicIp -ne 'N/A') {
    Update-DnsRecords -IpAddress $publicIp
  }

  Write-DeploymentSummary -Server $server

  Write-Log 'Provisioning completed successfully'
} catch {
  Write-Log "Provisioning failed: $($_.Exception.Message)" 'ERROR'
  exit 1
}
