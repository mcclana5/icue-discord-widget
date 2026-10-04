Set WshShell = CreateObject("WScript.Shell")
Set WmiService = GetObject("winmgmts:\\.\root\cimv2")
Set fso = CreateObject("Scripting.FileSystemObject")

Dim scriptPath, fullScriptPath
scriptPath = fso.GetParentFolderName(WScript.ScriptFullName)
fullScriptPath = scriptPath & "\index.js"

Do While True
    ' Check if iCUE.exe is currently running
    Set icueProcesses = WmiService.ExecQuery("Select * from Win32_Process Where Name = 'iCUE.exe'")
    
    If icueProcesses.Count > 0 Then
        ' iCUE is running. Check if our discord-bridge process is running
        Set nodeProcesses = WmiService.ExecQuery("Select * from Win32_Process Where Name = 'node.exe' AND CommandLine LIKE '%discord-bridge%'")
        If nodeProcesses.Count = 0 Then
            ' Launch with full path so CommandLine contains 'discord-bridge' in WMI
            WshShell.CurrentDirectory = scriptPath
            WshShell.Run "node """ & fullScriptPath & """", 0, False
        End If
    Else
        ' iCUE is closed -> Shut down discord bridge if running
        Set nodeProcesses = WmiService.ExecQuery("Select * from Win32_Process Where Name = 'node.exe' AND (CommandLine LIKE '%discord-bridge%' OR CommandLine LIKE '%index.js%')")
        For Each proc In nodeProcesses
            proc.Terminate()
        Next
    End If
    
    ' Check process status every 5 seconds (zero CPU load)
    WScript.Sleep 5000
Loop
