param($in, $out)
$app = New-Object -ComObject PowerPoint.Application
try {
  $p = $app.Presentations.Open($in, $true, $false, $false)
  $p.SaveAs($out, 32)
  $p.Close()
} finally { $app.Quit() }
