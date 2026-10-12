param($dir)
$w = New-Object -ComObject Word.Application; $w.Visible = $false; $w.DisplayAlerts = 0
try {
  $d = $w.Documents.Open("$dir\FormForge_Report_raw.docx", $false, $false)
  $d.Fields.Update() | Out-Null
  foreach ($t in $d.TablesOfContents) { $t.Update() }
  $d.Repaginate()
  foreach ($t in $d.TablesOfContents) { $t.UpdatePageNumbers() }
  $d.SaveAs2("$dir\FormForge_Report.docx", 16)
  $d.ExportAsFixedFormat("$dir\FormForge_Report.pdf", 17)
  $d.Close($false)
  "done"
} finally { $w.Quit() }
