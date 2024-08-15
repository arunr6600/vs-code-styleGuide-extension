"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resourceCache = exports.repositoryCache = void 0;
exports.activate = activate;
exports.getCachedContent = getCachedContent;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const MyTreeDataProvider_1 = require("./MyTreeDataProvider");
const MyWebView_1 = require("./MyWebView");
const node_fetch_1 = __importDefault(require("node-fetch"));
const repositoryUrls_1 = require("./repositoryUrls");
const snippetUrls_json_1 = __importDefault(require("./snippetUrls.json"));
exports.repositoryCache = {};
exports.resourceCache = {};
async function activate(context) {
    await updateAndRegisterSnippets(context);
    const treeDataProvider = new MyTreeDataProvider_1.MyTreeDataProvider();
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
        const storedRepositoryCache = context.workspaceState.get('repositoryCache', {});
        Object.assign(exports.repositoryCache, storedRepositoryCache);
        const storedResourceCache = context.workspaceState.get('resourceCache', {});
        Object.assign(exports.resourceCache, storedResourceCache);
        progress.report({ increment: 20, message: "Fetching resources..." });
        treeDataProvider.updateProgress(20);
        try {
            exports.resourceCache.darkCss = await fetchFileContent('https://gitlab.infra.aws.carestack.com/carestack-components/carestack-styles/-/raw/master/frameworks/careflow/styles/theme-dark.css?ref_type=heads');
            exports.resourceCache.lightCss = await fetchFileContent('https://gitlab.infra.aws.carestack.com/carestack-components/carestack-styles/-/raw/master/frameworks/careflow/styles/theme-light.css?ref_type=heads');
            exports.resourceCache.fontUrl = await convertFontToBase64('https://gitlab.infra.aws.carestack.com/carestack-components/carestack-styles/-/raw/master/frameworks/careflow/assets/careflow/fonts/careflow-icons.woff2');
            await context.workspaceState.update('resourceCache', exports.resourceCache);
        }
        catch (error) {
            console.error('Error fetching resources:', error);
        }
        progress.report({ increment: 40, message: "Fetching style guide data..." });
        treeDataProvider.updateProgress(40);
        await fetchAllData(context, progress, treeDataProvider);
        treeDataProvider.stopLoading();
        progress.report({ increment: 100, message: "Loading complete" });
    });
    vscode.commands.registerCommand('extension.openWebView', (item) => {
        MyWebView_1.MyWebView.createOrShow(context.extensionUri, item.label, `${item.parent}/${item.label}`, exports.resourceCache);
    });
}
async function fetchAllData(context, progress, treeDataProvider) {
    const totalItems = Object.keys(repositoryUrls_1.repositoryUrls).length;
    let completedItems = 0;
    let currentProgress = 40;
    const promises = Object.entries(repositoryUrls_1.repositoryUrls).map(async ([key, baseUrl]) => {
        try {
            const previewUrl = `${baseUrl}/preview.html`;
            const syntaxUrl = `${baseUrl}/syntax.html`;
            const previewResponse = await (0, node_fetch_1.default)(previewUrl);
            if (!previewResponse.ok) {
                throw new Error(`HTTP error! status: ${previewResponse.status}`);
            }
            const previewHtml = await previewResponse.text();
            let syntaxHtml = '';
            try {
                const syntaxResponse = await (0, node_fetch_1.default)(syntaxUrl);
                if (syntaxResponse.ok) {
                    syntaxHtml = await syntaxResponse.text();
                }
            }
            catch (syntaxError) {
                console.log(`No syntax.html found for ${key}, or error fetching it:`, syntaxError);
            }
            exports.repositoryCache[key] = { preview: previewHtml, syntax: syntaxHtml };
            await context.workspaceState.update('repositoryCache', exports.repositoryCache);
        }
        catch (error) {
            console.error(`Could not fetch ${baseUrl}: ${error instanceof Error ? error.message : 'unknown error'}`);
            exports.repositoryCache[key] = { preview: 'Error loading content', syntax: '' };
            await context.workspaceState.update('repositoryCache', exports.repositoryCache);
        }
        finally {
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
function getCachedContent(key) {
    const content = exports.repositoryCache[key] || { preview: 'No content available', syntax: 'No content available' };
    return content;
}
async function fetchFileContent(url) {
    const response = await (0, node_fetch_1.default)(url);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.text();
}
async function convertFontToBase64(url) {
    const response = await (0, node_fetch_1.default)(url);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    return `data:application/octet-stream;base64,${base64}`;
}
async function fetchSnippets(url, context) {
    try {
        const response = await (0, node_fetch_1.default)(url);
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
    }
    catch (error) {
        console.error(`Failed to fetch snippet from ${url}: ${error}`);
        return null;
    }
}
async function parseAndRegisterSnippets(context, snippetEntry) {
    const fullPath = path.join(context.extensionPath, snippetEntry.path);
    const snippetContent = fs.readFileSync(fullPath, 'utf8');
    const snippets = JSON.parse(snippetContent);
    const provider = vscode.languages.registerCompletionItemProvider(snippetEntry.language, {
        provideCompletionItems(document, position) {
            return Object.keys(snippets).map(key => {
                const snippet = snippets[key];
                const item = new vscode.CompletionItem(snippet.prefix, vscode.CompletionItemKind.Snippet);
                item.insertText = new vscode.SnippetString(snippet.body.join('\n'));
                item.documentation = new vscode.MarkdownString(snippet.description);
                return item;
            });
        }
    });
    context.subscriptions.push(provider);
}
async function updateAndRegisterSnippets(context) {
    const snippetEntries = [];
    let successCount = 0;
    let failCount = 0;
    for (const url of snippetUrls_json_1.default) {
        try {
            const snippetEntry = await fetchSnippets(url, context);
            if (snippetEntry) {
                snippetEntries.push(snippetEntry);
                await parseAndRegisterSnippets(context, snippetEntry);
                successCount++;
            }
            else {
                failCount++;
            }
        }
        catch (error) {
            console.error(`Error processing snippet from ${url}:`, error);
            failCount++;
        }
    }
    const packageJsonPath = path.join(context.extensionPath, 'package.json');
    let packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    packageJson.contributes = packageJson.contributes || {};
    packageJson.contributes.snippets = snippetEntries;
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    const totalCount = snippetUrls_json_1.default.length;
    let message = `Snippets added successfully! ${successCount} out of ${totalCount} snippets were processed.`;
    if (failCount > 0) {
        message += ` ${failCount} snippet(s) failed to process.`;
    }
    vscode.window.showInformationMessage(message);
    console.log(message);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map