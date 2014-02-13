@IF EXIST "%~dp0\node.exe" (
  "%~dp0\node.exe"  "C:\gitWip\CineProwl\Cli\bin\cineprowl" %*
) ELSE (
  node  "C:\gitWip\CineProwl\Cli\bin\cineprowl" %*
)