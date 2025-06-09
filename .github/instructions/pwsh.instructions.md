# PowerShell Development Guidelines

## Overview

Comprehensive PowerShell development standards based on Microsoft's
Strongly Encouraged Development Guidelines, adapted for modern
PowerShell 7.2+ development with enterprise best practices.

## Naming Conventions

### Cmdlet Names (SD01)

- **Use Specific Nouns**: Prefix generic nouns with product/module
  name

  - ✅ `Get-SQLServer` not `Get-Server`
  - ✅ `New-AzureResourceGroup` not `New-ResourceGroup`

- **Singular Nouns**: Always use singular form for cmdlet nouns
  - ✅ `Get-Process` not `Get-Processes`
  - ✅ `Remove-User` not `Remove-Users`

### Case Standards (SD02)

- **Pascal Case**: Capitalize first letter of verb and all noun terms
  - ✅ `Clear-ItemProperty`
  - ✅ `Set-ExecutionPolicy`
  - ❌ `clear-itemproperty`

## Parameter Design (SD03)

### Standard Parameter Names

Use approved parameter names for consistency:

| Purpose      | Standard Name | Alias    | Type         |
| ------------ | ------------- | -------- | ------------ |
| File Path    | `Path`        | `PSPath` | `[string[]]` |
| Literal Path | `LiteralPath` |          | `[string[]]` |
| Object Name  | `Name`        |          | `[string[]]` |
| Force Action | `Force`       |          | `[switch]`   |
| Pass Object  | `PassThru`    |          | `[switch]`   |

### Parameter Guidelines

- **Singular Names**: Use singular even for array parameters

  - ✅ `[string[]]$Name` not `[string[]]$Names`

- **Pascal Case**: Capitalize each word in parameter names

  - ✅ `$ErrorAction` not `$errorAction`

- **Strong Typing**: Use specific .NET types, avoid basic strings

  - ✅ `[System.Uri]$Url` not `[string]$Url`
  - ✅ `[ValidateSet('Dev','Test','Prod')][string]$Environment`

- **Switch Parameters**: Use for true/false scenarios

  - ✅ `[switch]$Force` not `[bool]$Force`

- **Nullable Boolean**: Use for three-state scenarios
  - ✅ `[System.Nullable[bool]]$Enabled` for unspecified option

### Array Support

Support arrays for bulk operations:

```powershell
[Parameter(ValueFromPipeline)]
[string[]]$ComputerName
```

### PassThru Parameter

Implement for cmdlets that modify system state:

```powershell
[Parameter()]
[switch]$PassThru

# In process block
if ($PassThru) {
    $result | Write-Output
}
```

## User Feedback (SD04)

### Output Methods

- **WriteVerbose**: Detailed operation information
- **WriteWarning**: Potentially unintended consequences
- **WriteDebug**: Developer/support troubleshooting
- **WriteProgress**: Long-running operations

```powershell
Write-Verbose "Processing item: $($item.Name)"
Write-Warning "File will be overwritten: $Path"
Write-Debug "Variable state: $($variable | ConvertTo-Json)"

# Progress for loops
$activity = "Processing Items"
for ($i = 0; $i -lt $items.Count; $i++) {
    $percentComplete = ($i / $items.Count) * 100
    Write-Progress -Activity $activity -Status "Item $($i+1) of $($items.Count)" -PercentComplete $percentComplete
}
```

### Never Use

- ❌ `Write-Host` - Use Write-Verbose, Write-Warning, or comments
- ❌ `System.Console` API - Use PowerShell output methods

## Parameter Implementation (SC01)

### Path Support

Implement proper PowerShell path handling:

```powershell
[Parameter(Position = 0, ValueFromPipeline)]
[string[]]$Path,

[Parameter()]
[Alias('PSPath')]
[string[]]$LiteralPath

# In process block
if ($PSBoundParameters.ContainsKey('Path')) {
    $resolvedPaths = $Path | ForEach-Object {
        $ExecutionContext.SessionState.Path.GetResolvedProviderPathFromPSPath($_, [ref]$null)
    }
}
```

### Wildcard Support

Enable wildcard patterns where appropriate:

```powershell
[Parameter()]
[SupportsWildcards()]
[string[]]$Name

# Use -like operator for matching
$results = $allItems.Where({ $_.Name -like $pattern })
```

### Pipeline Support (SC02)

Design for pipeline use:

```powershell
[CmdletBinding()]
param(
    [Parameter(ValueFromPipeline, ValueFromPipelineByPropertyName)]
    [string[]]$ComputerName
)

process {
    foreach ($computer in $ComputerName) {
        # Process each pipeline item immediately
        $result = Test-Connection -ComputerName $computer -Count 1 -Quiet
        [PSCustomObject]@{
            ComputerName = $computer
            IsOnline = $result
        }
    }
}
```

## Object Output (SC03)

### Immediate Output

Write objects as generated, don't buffer:

```powershell
# ✅ Good - Immediate output
foreach ($item in $items) {
    $result = Process-Item $item
    Write-Output $result
}

# ❌ Bad - Buffering
$results = @()
foreach ($item in $items) {
    $results += Process-Item $item
}
Write-Output $results
```

### Structured Objects

Return consistent object types:

```powershell
# Define consistent properties
[PSCustomObject]@{
    Name = $item.Name
    Status = $item.Status
    LastModified = $item.LastWriteTime
    Size = $item.Length
}
```

## Code Quality Standards

### Line Length

- **Preferred**: Keep lines under 60 characters
- **Acceptable**: Up to 90 characters when necessary
- **Maximum**: 120 characters only when unavoidable

### String Concatenation

Use `+` operator for long strings:

```powershell
$longMessage = "This is a very long message that needs to be " +
               "split into multiple lines for readability."
```

### Variable Expansion

Always use `$()` subexpression syntax:

```powershell
Write-Verbose "Processing: $($item.Name) with status $($item.Status)"
```

### Modern PowerShell Patterns

Target PowerShell 7.2+ features:

```powershell
# Use .ForEach() method instead of ForEach-Object
$results = $items.ForEach({ $_.ToUpper() })

# Use .Where() method instead of Where-Object
$filtered = $items.Where({ $_.Status -eq 'Active' })

# Use new() constructor instead of New-Object
$hash = [hashtable]::new()
$list = [System.Collections.Generic.List[string]]::new()
```

### Error Handling

Avoid `else` blocks, check for null/empty first:

```powershell
# ✅ Good
if (-not $item) {
    Write-Warning "Item is null or empty"
    return
}

# Process valid item
$result = $item.Process()

# ❌ Avoid
if ($item) {
    $result = $item.Process()
} else {
    Write-Warning "Item is null or empty"
    return
}
```

## Help Documentation (SD05)

### Comment-Based Help

Include comprehensive help for all functions:

```powershell
<#
.SYNOPSIS
    Brief description of the function.

.DESCRIPTION
    Detailed description of what the function does.

.PARAMETER Name
    Description of the Name parameter.

.EXAMPLE
    Get-MyFunction -Name "Example"

    Description of what this example does.

.EXAMPLE
    "Item1", "Item2" | Get-MyFunction

    Description of pipeline example.

.INPUTS
    System.String[]

.OUTPUTS
    System.Management.Automation.PSCustomObject

.NOTES
    Additional information about the function.

.LINK
    https://docs.microsoft.com/powershell/
#>
```

## Testing Standards

### Pester Tests

Write comprehensive tests:

```powershell
Describe "Get-MyFunction" {
    Context "Parameter Validation" {
        It "Should accept pipeline input" {
            "TestValue" | Get-MyFunction | Should -Not -BeNullOrEmpty
        }

        It "Should handle array input" {
            $result = Get-MyFunction -Name @("Item1", "Item2")
            $result.Count | Should -Be 2
        }
    }

    Context "Output Validation" {
        It "Should return expected object type" {
            $result = Get-MyFunction -Name "Test"
            $result | Should -BeOfType [PSCustomObject]
        }
    }
}
```

## Security Considerations

### Input Validation

Always validate parameters:

```powershell
[Parameter(Mandatory)]
[ValidateNotNullOrEmpty()]
[ValidatePattern('^[a-zA-Z0-9\-_]+$')]
[string]$Name
```

### Credential Handling

Use secure methods for credentials:

```powershell
[Parameter()]
[System.Management.Automation.PSCredential]$Credential
```

## Performance Guidelines

### Memory Efficiency

- Use pipeline processing for large datasets
- Avoid collecting all objects in memory
- Use `[System.Collections.Generic.List[T]]` for dynamic arrays

### Execution Efficiency

- Use .NET methods over cmdlets where appropriate
- Minimize object creation in loops
- Use splatting for complex parameter sets

## Example Function Template

```powershell
function Verb-Noun {
    [CmdletBinding(SupportsShouldProcess)]
    param(
        [Parameter(
            Mandatory,
            ValueFromPipeline,
            ValueFromPipelineByPropertyName
        )]
        [ValidateNotNullOrEmpty()]
        [string[]]$Name,

        [Parameter()]
        [switch]$PassThru
    )

    begin {
        Write-Verbose "Starting $($MyInvocation.MyCommand)"
    }

    process {
        foreach ($item in $Name) {
            if ($PSCmdlet.ShouldProcess($item, "Process Item")) {
                try {
                    Write-Verbose "Processing: $item"

                    # Main logic here
                    $result = [PSCustomObject]@{
                        Name = $item
                        Status = 'Processed'
                        Timestamp = Get-Date
                    }

                    if ($PassThru) {
                        Write-Output $result
                    }
                } catch {
                    Write-Error "Failed to process $item`: $($_.Exception.Message)"
                }
            }
        }
    }

    end {
        Write-Verbose "Completed $($MyInvocation.MyCommand)"
    }
}
```

## Compliance Checklist

- [ ] Cmdlet uses approved verb-noun format
- [ ] Parameters use Pascal case naming
- [ ] Standard parameter names used where applicable
- [ ] Pipeline input supported appropriately
- [ ] Comment-based help included
- [ ] Error handling implemented
- [ ] ShouldProcess used for system changes
- [ ] PassThru parameter for modifying cmdlets
- [ ] Verbose/Debug output provided
- [ ] Pester tests written
- [ ] Code follows line length guidelines
- [ ] Modern PowerShell patterns used

---

_Based on Microsoft's Strongly Encouraged Development Guidelines_
_Adapted for PowerShell 7.2+ and enterprise development practices_
