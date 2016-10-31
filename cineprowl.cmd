@IF EXIST "%~dp0\node.exe" (
  "%~dp0\node.exe"  "C:\gitWip\cineprowl\cineprowl-cli\bin\cineprowl" %*
) ELSE (
  node  "C:\gitWip\cineprowl\cineprowl-cli\bin\cineprowl" %*
)