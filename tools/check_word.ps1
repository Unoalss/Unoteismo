try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    Write-Output "Word COM is available"
    $docPath = "C:\Users\Administrador\Desktop\DIC\arquivos\site\Bíblia Sagrada (port-br) Unoteista (69 Livros - Sem Teofilo).docx"
    $doc = $word.Documents.Open($docPath, [Type]::Missing, $true)
    $pages = $doc.ComputeStatistics([Microsoft.Office.Interop.Word.WdStatistic]::wdStatisticPages)
    Write-Output "Total pages: $pages"
    $doc.Close([ref]$false)
    $word.Quit()
} catch {
    Write-Output "Error: $_"
}
