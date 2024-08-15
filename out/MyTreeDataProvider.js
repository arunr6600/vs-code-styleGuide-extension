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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TreeItem = exports.MyTreeDataProvider = void 0;
const vscode = __importStar(require("vscode"));
const repositoryUrls_1 = require("./repositoryUrls");
const childItems = {
    'General': {
        'Border': ['Border'],
        'Icon': ['Icon'],
        'Color Pallette': ['Color Palette', 'Background Color Palette'],
        'Flex': ['Flex Container', 'Flex Items'],
        'Typography': ['Typography', 'Vertical Align'],
        'Spacing': ['Padding', 'Margin', 'Gap'],
        'Display': ['Display'],
        'Position': ['Position'],
        'Cursor': ['Cursor'],
        'Resize': ['Resize'],
        'Size': ['Width', 'Height'],
        'Corner': ['Rounded Corner'],
        'Scroll': ['Scroll']
    },
    'Navigation': {
        'Tabs': ['Tab Primary', 'Tab Secondary', 'Tab Slideout'],
        'Sidebar': ['Sidebar'],
        'Page': ['Pagination'],
        'Wizard': ['Wizard Horizontal', 'Wizard Vertical']
    },
    'Data Input': {
        'Action Menu': ['Action Menu Accordion', 'Action Menu Black', 'Action Menu Border', 'Action Menu'],
        'Buttons': ['Button Ghost Danger', 'Button Ghost Default', 'Button Group', 'Button Link', 'Button Primary Danger', 'Button Primary Default', 'Button Secondary Danger', 'Button Secondary Default'],
        'Check Fields': ['Checkbox Group', 'Checkbox', 'Radio Button Group', 'Radio Button'],
        'Data Tables': ['Data Table Default', 'Data Table Empty', 'Data Table Scroll', 'Data Table With Field', 'Data Table'],
        'Date and Time': ['Datapicker', 'Double Calender Picker', 'Time Picker'],
        'Dropdowns': ['Dropdown Cell Checkbox', 'Dropdown Cell', 'Dropdown Checkbox', 'Dropdown Create Entry', 'Dropdown Empty Option', 'Dropdown Empty', 'Dropdown Filter', 'Dropdown List Check Group', 'Dropdown List Group', 'Dropdown Load More', 'Dropdown Multi Select', 'Dropdown Radio Button', 'Dropdown Search', 'Dropdown'],
        'Droppable': ['Droppable', 'Droppable Overlay'],
        'Form': ['Form Group'],
        'Input Fields': ['Field Group', 'Field Text Default', 'Form Control', 'Textarea'],
        'Segmented Button': ['Segmented Button'],
        'Toggle Button': ['Toggle Button'],
        'Trigger Button': ['Trigger Button']
    },
    'Data View': {
        'Avatars': ['Avatar Large', 'Avatar Medium', 'Avatar Small', 'Avatar X Small'],
        'Cards': ['Card Accordion', 'Card'],
        'Chips': ['Chip New', 'Chip Filter', 'Chip Group Horizontal', 'Chip Group Vertical', 'Chip Info', 'Chip Input', 'Chip Selection'],
        'Data Tiles': ['Data Tiles Group', 'Data Tiles Variants'],
        'Dividers': ['Horizontal Divider', 'Vertical Divider'],
        'Popovers': ['Regular Popover', 'Window Popover'],
        'Sections': ['Section Accordion', 'Section'],
        'Tags': ['Tag Dot', 'Tag Fill', 'Tag Outline', 'Tag Semi Fill', 'Tag Status'],
        'Tooltips': ['Tooltip Bottom', 'Tooltip Left', 'Tooltip Right', 'Tooltip Top'],
        'Headerbar': ['Headerbar'],
        'Trend': ['Trend']
    },
    'Feedback': {
        'Alert': ['Alert Title', 'Alert'],
        'Badge': ['Badge Counter', 'Badge Dot', 'Badge Label', 'Badge Status'],
        'Modal': ['Modal'],
        'Slideout': ['Slideout'],
        'Toast': ['Toast Close', 'Toast'],
        'Empty State': ['Click Action', 'Error Loading', 'Error', 'Information', 'No Data', 'No Operatory', 'Upload', 'User Action']
    },
    'Loading': {
        'Skeleton': ['Skeleton'],
        'Spinner': ['Spinner']
    },
    'Template': {
        'Page': ['Page']
    }
};
class MyTreeDataProvider {
    _onDidChangeTreeData = new vscode.EventEmitter();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    isLoading = true;
    progress = 0;
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (this.isLoading) {
            return Promise.resolve([
                new TreeItem(`Loading... ${this.progress}%`, vscode.TreeItemCollapsibleState.None, ''),
                new TreeItem(this.getProgressBar(), vscode.TreeItemCollapsibleState.None, '')
            ]);
        }
        if (!element) {
            return Promise.resolve(this.getRootItems());
        }
        else if (element.children) {
            return Promise.resolve(element.children);
        }
        else {
            return Promise.resolve(this.getChildItems(element.label));
        }
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    startLoading() {
        this.isLoading = true;
        this.progress = 0;
        this.refresh();
    }
    updateProgress(value) {
        this.progress = Math.min(Math.max(value, 0), 100);
        this.refresh();
    }
    stopLoading() {
        this.isLoading = false;
        this.progress = 100;
        this.refresh();
    }
    getProgressBar() {
        const filledChar = '█';
        const emptyChar = '░';
        const totalWidth = 20;
        const filledWidth = Math.round(this.progress / 100 * totalWidth);
        return filledChar.repeat(filledWidth) + emptyChar.repeat(totalWidth - filledWidth);
    }
    getRootItems() {
        const rootLabels = [
            'General',
            'Navigation',
            'Data Input',
            'Data View',
            'Feedback',
            'Loading',
            'Template',
        ];
        return rootLabels.map(label => new TreeItem(label, vscode.TreeItemCollapsibleState.Collapsed, '', undefined, undefined, true));
    }
    getChildItems(parentLabel) {
        const subcategoryKeysWithFolderIcons = Object.keys(childItems[parentLabel] || {});
        return Object.entries(childItems[parentLabel] || {}).map(([groupName, items]) => {
            const children = items.map(label => new TreeItem(label, vscode.TreeItemCollapsibleState.None, repositoryUrls_1.repositoryUrls[`${parentLabel}/${label}`], parentLabel, undefined, false, false, true));
            return new TreeItem(groupName, vscode.TreeItemCollapsibleState.Collapsed, '', parentLabel, children, false, subcategoryKeysWithFolderIcons.includes(groupName), false);
        });
    }
}
exports.MyTreeDataProvider = MyTreeDataProvider;
class TreeItem extends vscode.TreeItem {
    label;
    collapsibleState;
    repositoryUrl;
    parent;
    children;
    isParentLabel;
    isSubLabel;
    isLeafNode;
    constructor(label, collapsibleState, repositoryUrl, parent, children, isParentLabel = false, isSubLabel = false, isLeafNode = false) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.repositoryUrl = repositoryUrl;
        this.parent = parent;
        this.children = children;
        this.isParentLabel = isParentLabel;
        this.isSubLabel = isSubLabel;
        this.isLeafNode = isLeafNode;
        if (collapsibleState === vscode.TreeItemCollapsibleState.None && !children) {
            this.command = {
                command: 'extension.openWebView',
                title: 'Open Web View',
                arguments: [this]
            };
        }
        if (isParentLabel) {
            this.iconPath = new vscode.ThemeIcon('folder');
            this.contextValue = 'parentLabel';
            this.tooltip = `${label} (Parent)`;
            this.resourceUri = vscode.Uri.parse(`parentLabel:${label}`);
        }
        if (isSubLabel) {
            this.iconPath = new vscode.ThemeIcon('folder');
            this.contextValue = 'children';
            this.tooltip = `${label}`;
            this.resourceUri = vscode.Uri.parse(`children:${label}`);
        }
        if (isLeafNode) {
            this.iconPath = new vscode.ThemeIcon('file');
            this.contextValue = 'leafNode';
            this.tooltip = `${label}`;
        }
    }
}
exports.TreeItem = TreeItem;
//# sourceMappingURL=MyTreeDataProvider.js.map