try {
    $w = New-Object -ComObject Word.Application
    Write-Host "Success creating Word.Application"
    $doc = $w.Documents.Open("C:\Users\Administrador\Desktop\DIC\arquivos\site\Bíblia Sagrada (port-br) Unoteista (69 Livros - Sem Teofilo).docx", $false, $true)
    $pages = $doc.ComputeStatistics(2)
    Write-Host "PAGES_COUNT: $pages"
    $doc.Close([ref]$false)
    $w.Quit()
} catch {
    Write-Host "Exception: $($_.Exception.Message)"
}
