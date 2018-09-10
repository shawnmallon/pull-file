'use strict';
import { window, ExtensionContext, commands, TextDocument, TextEditor, OpenDialogOptions, QuickPickOptions, Uri } from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export function activate(context: ExtensionContext) {
    let disposable = commands.registerCommand('extension.pullFile', () => {
        // Pull content from a file into the active file.
        let editor = window.activeTextEditor;
        // Verify the active TextEditor is not undefined.
        if (editor) {
            let pullFile = new PullFile(editor);
            pullFile.Pull();
        }
    });

    context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {
}

/**
 * Pull the contents of a file into the active file.
 */
class PullFile {
    _activeDocument: TextDocument;
    _extension: string;
    _currentDirectory: string;
    _useOpenDialogText: string = "Use Open Dialog...";

    /**
     * Get the active TextDocument and its file extension from the active TextEditor.
     * @param editor The active TextEditor
     */
    constructor(editor: TextEditor) {
        this._activeDocument = editor.document;
        this._extension = path.extname(this._activeDocument.fileName).replace('.', '');
        this._currentDirectory = path.dirname(this._activeDocument.fileName);
    }

    /**
     * Pull the contents of a file into the active file.
     */
    public Pull() {
        // Select a file.
        this.SelectFile().then((fileToPull) => {
            // If a file was selected, copy that file to the current file.
            if (fileToPull) {
                this.CopyFile(fileToPull);
            }
        });
    }

    /**
     * Select the file to pull using a quickpick or the open dialog.
     * @returns A promise that resolves to the selected file or undefined.
     */
    private SelectFile(): Thenable<string | undefined> {
        // Create a Promise to for the selected file.
        const promise: Promise<string | undefined> = new Promise((resolve, reject) => {
            // Show a QuickPick for file selection first.
            this.ShowQuickPick().then((selection) => {
                // If there was a selection made then see if it was to use the open dialog.
                if (selection) {
                    // If a file was not selected in the QuickPick, show an OpenDialog for file selection.
                    if (selection === this._useOpenDialogText) {
                        this.ShowOpenDialog().then((fileUri) => {
                            // If there is a selection, resolve the promise to it.
                            if (fileUri && fileUri[0]) {
                                resolve(fileUri[0].fsPath);
                            }
                        });
                    }
                    else {
                        // If there is a file selection, append it to the current directory path then resolve the promise to it.
                        let selectedFile: string = path.join(this._currentDirectory, selection);
                        resolve(selectedFile);
                    }
                }
            });
        });
        
        return promise;
    }

    /**
     * Show a QuickPick with the files in the current directory.
     * @returns The thenable of the show quick pick.
     */
    private ShowQuickPick(): Thenable<string | undefined> {
        // Get the files in the current directory.
        let filesInCurrentDirectory: string[] = fs.readdirSync(this._currentDirectory);

        // Create an array to hold the filtered items to show.
        let filesToShow: string[] = [];
        let currentIndex = 1;
        // Add an option to use the open dialog as the first option.
        filesToShow[0] = this._useOpenDialogText;

        // Remove the current file from the list.
        filesInCurrentDirectory.forEach((value) => {
            if (value !== path.basename(this._activeDocument.fileName)) {
                filesToShow[currentIndex] = value;
                currentIndex++;
            }
        });
        
        const quickPickOptions: QuickPickOptions = {
            canPickMany: false,
            placeHolder: "Select a file to pull..."
        };

        return window.showQuickPick(filesToShow, quickPickOptions);
    }

    /**
     * Show an OpenDialog with the options from GetOptions.
     * @returns The thenable of the show open dialog.
     */
    private ShowOpenDialog(): Thenable<Uri[] | undefined> {
        const options = this.GetOptions();
    
        // Let the user pick a file with the OS file open dialog.
        return window.showOpenDialog(options);
    }

    /**
     * Copy the file represented by fileToPull to the current file.
     * @param fileToPull The filepath of the file to pull.
     */
    private CopyFile(fileToPull: string) {
        // If the file has changes then save them first so the editor shows the external changes.
        if (this._activeDocument.isDirty) {
            this._activeDocument.save().then(() => {
                // Copy the selected file to the currently opened file and overwrite it.
                fs.copyFileSync(fileToPull, this._activeDocument.fileName);
            });
        }
        // If the file isn't dirty then we can just overwrite and the editor will show the change.
        else {
            // Copy the selected file to the currently opened file and overwrite it.
            fs.copyFileSync(fileToPull, this._activeDocument.fileName);
        }
    }

    /**
     * Get the OpenDialogOptions for the OpenDialog.
     */
    private GetOptions(): OpenDialogOptions {
        // Set the options for the OpenDialog.
        const options: OpenDialogOptions = {
            canSelectMany: false,
            openLabel: "Pull File",
            defaultUri: Uri.file(this._currentDirectory),
            filters: {
                "All Files": ["*"]
            }
        };
    
        // Add a filter for the current file type if the extension can be found.
        if (this._extension !== "") {
            options.filters = {
                "Current File Type": [this._extension],
                "All Files": ["*"]
            };
        }

        return options;
    }
}