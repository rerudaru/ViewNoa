// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// Get folder path from configuration
function getFolderPath(): string {
	const config = vscode.workspace.getConfiguration('viewNoa');
	const folderPath = config.get('imageFolder') as string;
	if (!folderPath) {
		vscode.window.showErrorMessage('ViewNoa: 画像フォルダが設定されていません。設定から "viewNoa.imageFolder" を指定してください。');
		return '';
	}
	return folderPath;
}

// Function to get all image files from the fixed folder
function getImageFiles(): string[] {
	const folderPath = getFolderPath();
	if (!folderPath) {return [];}
	const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
	const imageFiles: string[] = [];

	function scanDirectory(dir: string) {
		try {
			const files = fs.readdirSync(dir);
			for (const file of files) {
				const fullPath = path.join(dir, file);
				const stat = fs.statSync(fullPath);
				if (stat.isDirectory()) {
					scanDirectory(fullPath);
				} else if (stat.isFile() && imageExtensions.includes(path.extname(file).toLowerCase())) {
					imageFiles.push(fullPath);
				}
			}
		} catch (error) {
			console.error('Error scanning directory:', error);
		}
	}

	scanDirectory(folderPath);
	return imageFiles;
}

// Function to get a random image
function getRandomImage(imageFiles: string[]): { base64: string, mimeType: string } | null {
	if (imageFiles.length === 0) {
		return null;
	}
	const randomIndex = Math.floor(Math.random() * imageFiles.length);
	const selectedImage = imageFiles[randomIndex];

	try {
		const imageBuffer = fs.readFileSync(selectedImage);
		const base64Image = imageBuffer.toString('base64');
		const ext = path.extname(selectedImage).toLowerCase();
		let mimeType = 'image/png'; // default
		if (ext === '.jpg' || ext === '.jpeg') {
			mimeType = 'image/jpeg';
		} else if (ext === '.png') {
			mimeType = 'image/png';
		} else if (ext === '.gif') {
			mimeType = 'image/gif';
		} else if (ext === '.bmp') {
			mimeType = 'image/bmp';
		} else if (ext === '.webp') {
			mimeType = 'image/webp';
		}

		return { base64: base64Image, mimeType };
	} catch (error) {
		console.error('Error reading image:', error);
		return null;
	}
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "ViewNoa" is now active!');

	// Automatically show random image on activation
	showRandomImage(context);
}

// Function to show random image
function showRandomImage(context: vscode.ExtensionContext) {
	// Get all image files from the fixed folder
	const imageFiles = getImageFiles();

	if (imageFiles.length === 0) {
		vscode.window.showInformationMessage('No image files found in the Screenshots folder.');
		return;
	}

	// Get initial random image
	const initialImage = getRandomImage(imageFiles);
	if (!initialImage) {
		vscode.window.showInformationMessage('Failed to load initial image.');
		return;
	}

	// Create webview panel
	const panel = vscode.window.createWebviewPanel(
		'randomImageViewer',
		'Random Screenshot',
		vscode.ViewColumn.One,
		{
			enableScripts: true
		}
	);

	// Set HTML content
	panel.webview.html = `
		<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>Random Screenshot</title>
			<style>
				body {
					display: flex;
					justify-content: center;
					align-items: center;
					height: 100vh;
					margin: 0;
					background-color: #1e1e1e;
				}
				img {
					max-width: 100%;
					max-height: 100%;
				}
			</style>
		</head>
		<body>
			<img id="image" src="data:${initialImage.mimeType};base64,${initialImage.base64}" alt="Random Screenshot" />
		</body>
		</html>
	`;

	// Schedule to close and open new image after 1 minute
	const timeoutId = setTimeout(() => {
		panel.dispose();
		showRandomImage(context);
	}, 60000);

	// Handle panel disposal
	panel.onDidDispose(
		() => {
			clearTimeout(timeoutId);
		},
		null,
		context.subscriptions
	);
}

// This method is called when your extension is deactivated
export function deactivate() {}
