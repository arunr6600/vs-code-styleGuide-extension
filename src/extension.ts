import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { MyTreeDataProvider, TreeItem } from './MyTreeDataProvider';
import { MyWebView } from './MyWebView';
import fetch from 'node-fetch';
import { repositoryUrls } from './repositoryUrls';
import snippetUrls from './snippetUrls.json';

export const repositoryCache: { [key: string]: { preview: string, syntax: string } } = {};
export const resourceCache: {darkCss?: string; lightCss?: string; fontUrl?: string;} = {};

export async function activate(context: vscode.ExtensionContext) {
    await updateAndRegisterSnippets(context);
    const treeDataProvider = new MyTreeDataProvider();
    const treeView = vscode.window.createTreeView('styleGuide', { 
        treeDataProvider: treeDataProvider,
        showCollapseAll: true
    });
    treeDataProvider.startLoading();
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Loading Style Guide",
        cancellable: false
    }, async (progress) => {
        progress.report({ increment: 0 });
        treeDataProvider.updateProgress(0);
        const storedRepositoryCache = context.workspaceState.get<typeof repositoryCache>('repositoryCache', {});
        Object.assign(repositoryCache, storedRepositoryCache);
        const storedResourceCache = context.workspaceState.get<typeof resourceCache>('resourceCache', {});
        Object.assign(resourceCache, storedResourceCache);
        progress.report({ increment: 20, message: "Fetching resources..." });
        treeDataProvider.updateProgress(20);
        try {
            resourceCache.darkCss = await fetchFileContent('https://gitlab.infra.aws.carestack.com/carestack-components/carestack-styles/-/raw/master/frameworks/careflow/styles/theme-dark.css?ref_type=heads');
            resourceCache.lightCss = await fetchFileContent('https://gitlab.infra.aws.carestack.com/carestack-components/carestack-styles/-/raw/master/frameworks/careflow/styles/theme-light.css?ref_type=heads');
            resourceCache.fontUrl = await convertFontToBase64('https://gitlab.infra.aws.carestack.com/carestack-components/carestack-styles/-/raw/master/frameworks/careflow/assets/careflow/fonts/careflow-icons.woff2');
            await context.workspaceState.update('resourceCache', resourceCache);
        } catch (error) {
            console.error('Error fetching resources:', error);
        }
        progress.report({ increment: 40, message: "Fetching style guide data..." });
        treeDataProvider.updateProgress(40);
        await fetchAllData(context, progress, treeDataProvider);
        treeDataProvider.stopLoading();
        progress.report({ increment: 100, message: "Loading complete" });
    });
    vscode.commands.registerCommand('extension.openWebView', (item: TreeItem) => {
        MyWebView.createOrShow(context.extensionUri, item.label, `${item.parent}/${item.label}`, resourceCache);
    });
    }
async function fetchAllData(context: vscode.ExtensionContext, progress: vscode.Progress<{ increment?: number; message?: string }>, treeDataProvider: MyTreeDataProvider) {
    const totalItems = Object.keys(repositoryUrls).length;
    let completedItems = 0;
    let currentProgress = 40;

    const promises = Object.entries(repositoryUrls).map(async ([key, baseUrl]) => {
        try {
            const previewUrl = `${baseUrl}/preview.html`;
            const syntaxUrl = `${baseUrl}/syntax.html`;

            const previewResponse = await fetch(previewUrl);

            if (!previewResponse.ok) {
                throw new Error(`HTTP error! status: ${previewResponse.status}`);
            }

            const previewHtml = await previewResponse.text();

            let syntaxHtml = '';
            try {
                const syntaxResponse = await fetch(syntaxUrl);
                if (syntaxResponse.ok) {
                    syntaxHtml = await syntaxResponse.text();
                }
            } catch (syntaxError) {
                console.log(`No syntax.html found for ${key}, or error fetching it:`, syntaxError);
            }

            repositoryCache[key] = { preview: previewHtml, syntax: syntaxHtml };
            await context.workspaceState.update('repositoryCache', repositoryCache);

        } catch (error) {
            console.error(`Could not fetch ${baseUrl}: ${error instanceof Error ? error.message : 'unknown error'}`);
            repositoryCache[key] = { preview: 'Error loading content', syntax: '' };
            await context.workspaceState.update('repositoryCache', repositoryCache);
        } finally {
            completedItems++;
            const newProgress = 40 + Math.round((completedItems / totalItems) * 60); // 60% of the total progress is for fetching data
            const increment = newProgress - currentProgress;
            currentProgress = newProgress;
            progress.report({ increment, message: `Fetched ${completedItems}/${totalItems} items` });
            treeDataProvider.updateProgress(currentProgress);
        }
    });
    await Promise.all(promises);
}
export function getCachedContent(key: string): { preview: string, syntax: string } {
    const content = repositoryCache[key] || { preview: 'No content available', syntax: 'No content available' };
    return content;
}
async function fetchFileContent(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.text();
}
async function convertFontToBase64(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    return `data:application/octet-stream;base64,${base64}`;
}
async function fetchSnippets(url: string, context: vscode.ExtensionContext): Promise<{ language: string; path: string } | null> {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const snippetContent = await response.text();
        const filename = path.basename(url);
        const localPath = path.join(context.extensionPath, 'src', 'snippets', filename);

        // Ensure the snippets directory exists
        fs.mkdirSync(path.dirname(localPath), { recursive: true });

        // Save the snippet file locally
        fs.writeFileSync(localPath, snippetContent, 'utf8');

        return {
            language: 'html', 
            path: `src/snippets/${filename}`
        };
    } catch (error) {
        console.error(`Failed to fetch snippet from ${url}: ${error}`);
        return null;
    }
}
async function parseAndRegisterSnippets(context: vscode.ExtensionContext, snippetEntry: { language: string; path: string }) {
    const fullPath = path.join(context.extensionPath, snippetEntry.path);
    const snippetContent = fs.readFileSync(fullPath, 'utf8');
    const snippets = JSON.parse(snippetContent);

    const provider = vscode.languages.registerCompletionItemProvider(
        snippetEntry.language,
        {
            provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
                return Object.keys(snippets).map(key => {
                    const snippet = snippets[key];
                    const item = new vscode.CompletionItem(snippet.prefix, vscode.CompletionItemKind.Snippet);
                    item.insertText = new vscode.SnippetString(snippet.body.join('\n'));
                    item.documentation = new vscode.MarkdownString(snippet.description);
                    return item;
                });
            }
        }
    );

    context.subscriptions.push(provider);
}
async function updateAndRegisterSnippets(context: vscode.ExtensionContext): Promise<void> {
    const snippetEntries = [];
    let successCount = 0;
    let failCount = 0;

    for (const url of snippetUrls) {
        try {
            const snippetEntry = await fetchSnippets(url, context);
            if (snippetEntry) {
                snippetEntries.push(snippetEntry);
                await parseAndRegisterSnippets(context, snippetEntry);
                successCount++;
            } else {
                failCount++;
            }
        } catch (error) {
            console.error(`Error processing snippet from ${url}:`, error);
            failCount++;
        }
    }

    const packageJsonPath = path.join(context.extensionPath, 'package.json');
    let packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    packageJson.contributes = packageJson.contributes || {};
    packageJson.contributes.snippets = snippetEntries;
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

    const totalCount = snippetUrls.length;
    let message = `Snippets added successfully! ${successCount} out of ${totalCount} snippets were processed.`;
    
    if (failCount > 0) {
        message += ` ${failCount} snippet(s) failed to process.`;
    }

    vscode.window.showInformationMessage(message);
    console.log(message);
}
export function deactivate() { }