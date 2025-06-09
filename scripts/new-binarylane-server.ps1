param(
  [Parameter(Mandatory = $true)]
  [String]$vmName,

  [Parameter(Mandatory = $true)]
  [String]$region,

  [Parameter(Mandatory = $true)]
  [String]$size,

  [Parameter(Mandatory = $true)]
  [String]$image,

  [Parameter(Mandatory = $false)]
  [Switch]$responseHeaders

)

$Parameters = @{
  UserName = 'API Access Token'
  Message  = 'Enter your BinaryLane API token'
}

$apiToken = (Get-Credential @Parameters).GetNetworkCredential().Password

$headers = @{
  'Authorization' = "Bearer $apiToken"
  'Content-Type'  = 'application/json'
}

$body = @{
  name               = $vmName
  region             = $region
  size               = $size
  image              = $image
  ssh_keys           = @()
  backups            = $false
  ipv6               = $false
  private_networking = $false
  user_data          = $null
} | ConvertTo-Json -Depth 5

$Parameters = @{
  Uri                     = 'https://api.binarylane.com.au/v2/servers'
  Method                  = 'POST'
  Headers                 = $headers
  Body                    = $body
  ResponseHeadersVariable = 'h'
  StatusCodeVariable      = 'c'
  SkipHttpErrorCheck      = $true
}

$response = Invoke-RestMethod @Parameters

if ($c -ne 200) {

  throw "Failed to create VM: $($response | ConvertTo-Json -Depth 10)"
}

if ($responseHeaders) {

  $Parameters = @{
    MemberType = 'NoteProperty'
    Name       = 'ResponseHeaders'
    Value      = $h
    Force      = $true
  }

  $response | Add-Member @Parameters
}

$response
