import * as vscode from 'vscode';
import { repositoryUrls } from './repositoryUrls';
type ParentLabel = 'General' | 'Feedback' | 'Loading' | 'Data View' | 'Template' | 'Navigation' | 'Data Input';
const childItems: { [key in ParentLabel]?: { [key: string]: string[] } } = {
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

export class MyTreeDataProvider implements vscode.TreeDataProvider<TreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined | void> = new vscode.EventEmitter<TreeItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined | void> = this._onDidChangeTreeData.event;
    private isLoading: boolean = true;
    private progress: number = 0;
    getTreeItem(element: TreeItem): vscode.TreeItem {
        return element;
    }
    getChildren(element?: TreeItem): Thenable<TreeItem[]> {
        if (this.isLoading) {
            return Promise.resolve([
                new TreeItem(`Loading... ${this.progress}%`, vscode.TreeItemCollapsibleState.None, ''),
                new TreeItem(this.getProgressBar(), vscode.TreeItemCollapsibleState.None, '')
            ]);
        }
        if (!element) {
            return Promise.resolve(this.getRootItems());
        } else if (element.children) {
            return Promise.resolve(element.children);
        } else {
            return Promise.resolve(this.getChildItems(element.label as ParentLabel));
        }
    }
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }
    startLoading() {
        this.isLoading = true;
        this.progress = 0;
        this.refresh();
    }
    updateProgress(value: number) {
        this.progress = Math.min(Math.max(value, 0), 100);
        this.refresh();
    }
    stopLoading() {
        this.isLoading = false;
        this.progress = 100;
        this.refresh();
    }
    private getProgressBar(): string {
        const filledChar = '█';
        const emptyChar = '░';
        const totalWidth = 20;
        const filledWidth = Math.round(this.progress / 100 * totalWidth);
        return filledChar.repeat(filledWidth) + emptyChar.repeat(totalWidth - filledWidth);
    }
    private getRootItems(): TreeItem[] {
        const rootLabels: ParentLabel[] = [
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
    private getChildItems(parentLabel: ParentLabel): TreeItem[] {
        const subcategoryKeysWithFolderIcons = Object.keys(childItems[parentLabel] || {});

        return Object.entries(childItems[parentLabel] || {}).map(([groupName, items]) => {
            const children = items.map(label =>
                new TreeItem(
                    label,
                    vscode.TreeItemCollapsibleState.None,
                    repositoryUrls[`${parentLabel}/${label}`],
                    parentLabel,
                    undefined,
                    false,
                    false,
                    true
                )
            );
            return new TreeItem(
                groupName,
                vscode.TreeItemCollapsibleState.Collapsed,
                '',
                parentLabel,
                children,
                false,
                subcategoryKeysWithFolderIcons.includes(groupName),
                false 
            );
        });
    }
}
export class TreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly repositoryUrl: string,
        public readonly parent?: string,
        public readonly children?: TreeItem[],
        public readonly isParentLabel: boolean = false,
        public readonly isSubLabel: boolean = false,
        public readonly isLeafNode: boolean = false
    ) {
        super(label, collapsibleState);

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