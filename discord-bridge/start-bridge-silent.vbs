Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

Dim scriptPath, fullScriptPath
scriptPath = fso.GetParentFolderName(WScript.ScriptFullName)
fullScriptPath = scriptPath & "\index.js"

WshShell.CurrentDirectory = scriptPath
WshShell.Run "node """ & fullScriptPath & """", 0, False
