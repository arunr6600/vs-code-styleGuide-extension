import * as vscode from 'vscode';
import fetch from 'node-fetch';
import { getCachedContent } from './extension';
export class MyWebView {
    public static currentPanel: MyWebView | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private _cachedResources: {
        darkCss?: string;
        lightCss?: string;
        fontUrl?: string;
    };
    public static createOrShow(extensionUri: vscode.Uri,
        label: string,
        key: string,
        cachedResources: {
            darkCss?: string;
            lightCss?: string;
            fontUrl?: string;
        }) {
        const column = vscode.ViewColumn.One;
        if (MyWebView.currentPanel) {
            MyWebView.currentPanel._panel.reveal(column);
            MyWebView.currentPanel._update(label, key);
            return;
        }
        const panel = vscode.window.createWebviewPanel(
            'myWebView',
            'My Web View',
            column,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
            }
        );
        MyWebView.currentPanel = new MyWebView(panel, extensionUri, label, key, cachedResources);
        MyWebView.currentPanel._update(label, key);
    }
    private constructor(panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        label: string,
        key: string,
        cachedResources: {
            darkCss?: string;
            lightCss?: string;
            fontUrl?: string;
        }) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._cachedResources = cachedResources;
        this._update(label, key);
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.onDidChangeViewState(
            e => {
                if (this._panel.visible) {
                    this._update(label, key);
                }
            },
            null,
            this._disposables
        );
        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'alert':
                        vscode.window.showErrorMessage(message.text);
                        return;
                    case 'info':
                        vscode.window.showInformationMessage(message.text);
                        return;
                    case 'warning':
                        vscode.window.showWarningMessage(message.text);
                        return;
                }
            },
            null,
            this._disposables
        );
    }
    public dispose() {
        MyWebView.currentPanel = undefined;

        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
    private async _update(label: string, key: string) {
        const webview = this._panel.webview;
        const { preview, syntax } = getCachedContent(key);
        this._panel.title = label;
        this._panel.webview.html = await this._getHtmlForWebview(webview, label, preview, syntax);
    }
    private async _getHtmlForWebview(webview: vscode.Webview, label: string, previewHtml: string, syntaxHtml: string) {
        const darkCss = this._cachedResources.darkCss || await this.fetchFileContent('https://gitlab.infra.aws.carestack.com/carestack-components/carestack-styles/-/raw/master/frameworks/careflow/styles/theme-dark.css?ref_type=heads');
        const lightCss = this._cachedResources.lightCss || await this.fetchFileContent('https://gitlab.infra.aws.carestack.com/carestack-components/carestack-styles/-/raw/master/frameworks/careflow/styles/theme-light.css?ref_type=heads');
        const fontUrl = this._cachedResources.fontUrl || await this.convertFontToBase64('https://gitlab.infra.aws.carestack.com/carestack-components/carestack-styles/-/raw/master/frameworks/careflow/assets/careflow/fonts/careflow-icons.woff2');
        const encodedDarkCss = darkCss.replace(/\\/g, '\\\\');
        const encodedLightCss = lightCss.replace(/\\/g, '\\\\');
        previewHtml = previewHtml.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
        const showSyntaxSection = syntaxHtml && syntaxHtml.trim() !== '' && !syntaxHtml.includes('Error loading content');
        const syntaxSection = showSyntaxSection ? `
        <div class="section m-top">
        <div class="flex-box">
            <h2>Syntax</h2>
            <button class="toggle-button" onclick="copyToClipboard()">Copy to Clipboard</button>
        </div>
            <pre id="syntax-pre" class="language-html"><code id="syntax-code" class="language-html">${syntaxHtml.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
        </div>` : '';
        const fontFace = `
            @font-face {
                font-family: 'Careflow-icons';
                src: url('${fontUrl}') format('woff2');
                font-weight: normal;
                font-style: normal;
            }
        `;
        return `<!DOCTYPE html>
        <html lang="en" class="iframe-container">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/prism-themes/1.9.0/prism-vsc-dark-plus.min.css">
            <script src="https://cdn.jsdelivr.net/npm/prismjs@1.28.0/prism.min.js"></script>
            <script>
            Prism.languages.customhtml = Prism.languages.extend('html', {
                'tag': {
                    pattern: /<\/?(?!DOCTYPE\\s)([a-z0-9_-]+)/i,
                    inside: {
                        'punctuation': /<\/?/,
                        'tag-name': /^[a-z0-9_-]+/i
                    }
                },
                'attr-name': /[a-z0-9_-]+/i,
                'attr-value': {
                    pattern: /=(["'])(?:(?!\\x01)[^\\\\]|\\\\.)*\\x01/,
                    inside: {
                        'punctuation': /^=/,
                        'string': /["']/
                    }
                },
                'punctuation': /[<>="']/,
                'class-name': /\\.[a-z0-9_-]+/i,
                'id': /#[a-z0-9_-]+/i
            });
            window.onload = function() {
                Prism.highlightAll();
            };
            </script>
            <style>
                ${fontFace}
                :root {
                    --button-background: var(--vscode-button-background);
                    --button-foreground: var(--vscode-button-foreground);
                    --button-hover-background: var(--vscode-button-hoverBackground);
                }
                .dark {
                    --button-background: #333; /* Dark theme background color */
                    --button-foreground: #fff; /* Dark theme foreground color */
                    --button-hover-background: #555; /* Dark theme hover background color */
                }
                .iframe-container{
                    height: calc(100% - 32px); 
                    padding:16px;
                }
                .iframe-container .iframe-frame {
                    background-color:#fff;
                    padding:12px;
                    height: 100%;
                    border: none;
                }
                .iframe-container.dark .iframe-frame {
                    background-color:#000;
                }
                .iframe-body{
                    padding: 0;
                    display: flex;
                    flex-direction: column;
                    height:100%; 
                }
                h2{
                    margin:0;
                }
                .section{
                    display:flex;
                    flex-direction: column;
                    gap:12px;
                    flex:1;
                    min-height:0;
                    transition:all 0.2s ease-in;
                }
                .toggle-button {
                    padding: 10px 20px;
                    cursor: pointer;
                    background-color: var(--button-background);
                    color: var(--button-foreground);
                    border: none;
                    border-radius: 5px;
                    font-size:15px;
                }
                .toggle-button:hover {
                    background-color: var(--button-hover-background);
                }
                .dark .copy-button {
                    background-color: #555;
                }
                .flex-box{
                    display:flex;
                    align-items:center;
                    justify-content:space-between;
                }
                .flex{
                    display:flex;
                    align-items:center;
                    gap:12px
                }
                .m-top{
                    margin-top:16px
                }
                pre[class*="language-"]{
                    text-shadow: none;
                    position: relative;
                    height:100%;
                    margin:0;
                    padding:0;
                }
                code[class*="language-"]{
                    display: block;
                    white-space: pre-wrap;
                    word-wrap: break-word;
                    padding:5px;
                    min-height:100%;
                }
            </style>
        </head>
        <body class="iframe-body">
            <div class="section">
                <div class="flex-box">
                    <h2>Template</h2>
                    <div class="flex">
                    <h3>Theme</h3>
                    <span>:</span>
                    <button id="toggleButton" class="toggle-button" onclick="toggleTheme()">Switch to Dark Theme</button>
                    </div>
                </div>
                    <iframe id="preview-frame" class="iframe-frame"></iframe>
            </div>
            ${syntaxSection}
            <script>
                const vscode = acquireVsCodeApi();
                
                function toggleTheme() {
                    document.documentElement.classList.toggle('dark');
                    const button = document.getElementById('toggleButton');
                    const isDark = document.documentElement.classList.contains('dark');
                    if (isDark) {
                        button.textContent = 'Switch to Light Theme';
                        localStorage.setItem('theme', 'dark');
                    } else {
                        button.textContent = 'Switch to Dark Theme';
                        localStorage.setItem('theme', 'light');
                    }
                    updateIframeStyle();
                }
                function applyTheme() {
                    const savedTheme = localStorage.getItem('theme');
                    if (savedTheme === 'dark') {
                        document.documentElement.classList.add('dark');
                        document.getElementById('toggleButton').textContent = 'Switch to Light Theme';
                    } else {
                        document.documentElement.classList.remove('dark');
                        document.getElementById('toggleButton').textContent = 'Switch to Dark Theme';
                    }
                        updateIframeStyle();
                }
                function updateIframeStyle() {
                    const iframe = document.getElementById('preview-frame');
                    const doc = iframe.contentDocument || iframe.contentWindow.document;
                    const isDark = localStorage.getItem('theme') === 'dark';
                    const css = isDark ? \`${encodedDarkCss}\` : \`${encodedLightCss}\`;
                    const themeClass = isDark ? ' cfs-theme-dark' : ' cfs-theme-light';
                    doc.open();
                    doc.write(\`
                        <html lang="en" class="\${themeClass}\">
                        <head>
                        <style>
                        \${css}
                        .light-theme{background-color:#fff;}
                        </style>
                            <style>
                            ${fontFace}
                            </style>
                            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/prismjs@1.28.0/themes/prism.css">
                        </head>
                        <body>\${\`${previewHtml}\`}</body>
                        </html>
                    \`);
                    doc.close();
                    doc.querySelectorAll('.icon-content').forEach(item => {
                    item.addEventListener('click', (event) => {
                    const spanTag = item.querySelector('span');
                    if (spanTag) {
                        copySpanToClipboard(spanTag.outerHTML);
                        item.classList.add('copying');
                        setTimeout(() => {
                            item.classList.remove('copying');
                            }, 2000);
                    }
                });
            });
                }
            function copySpanToClipboard(spanHtml) {
            navigator.clipboard.writeText(spanHtml).then(() => {
                vscode.postMessage({ command: 'info', text: 'Copied to clipboard: ' + spanHtml });
            }).catch(err => {
                vscode.postMessage({ command: 'alert', text: 'Failed to copy' });
            });
        }
                window.onload = () => {
                Prism.highlightAll();
                applyTheme();
                }
    
                function sendMessage() {
                    vscode.postMessage({ command: 'alert', text: 'Hello from Webview' });
                }
    
                function copyToClipboard() {
                    const syntaxCode = document.getElementById('syntax-code').innerText;
                    navigator.clipboard.writeText(syntaxCode).then(() => {
                        vscode.postMessage({ command: 'info', text: 'Copied to clipboard' });
                    }).catch(err => {
                        vscode.postMessage({ command: 'alert', text: 'Failed to copy' });
                    });
                }
            </script>
        </body>
        </html>`;
    }
    private async fetchFileContent(url: string): Promise<string> {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.text();
        } catch (error) {
            if (error instanceof Error) {
                console.error(`Could not fetch ${url}: ${error.message}`);
            } else {
                console.error(`Could not fetch ${url}: unknown error`);
            }
            return 'Error loading content';
        }
    }
    private async convertFontToBase64(url: string): Promise<string> {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const buffer = await response.arrayBuffer();
            const base64 = Buffer.from(buffer).toString('base64');
            return `data:application/octet-stream;base64,${base64}`;
        } catch (error) {
            if (error instanceof Error) {
                console.error(`Could not convert ${url} to base64: ${error.message}`);
            } else {
                console.error(`Could not convert ${url} to base64: unknown error`);
            }
            return 'Error converting font to base64';
        }
    }
}
