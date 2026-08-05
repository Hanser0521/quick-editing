import { App, Modal, Setting } from 'obsidian';

import type { TransformationSummary } from '../transformations/preview';

export class TransformationPreviewModal extends Modal {
  constructor(
    app: App,
    private readonly titleText: string,
    private readonly summary: TransformationSummary,
    private readonly apply: () => void,
  ) {
    super(app);
  }

  openInDocument(targetDocument: Document): void {
    this.open();
    if (this.containerEl.ownerDocument !== targetDocument) {
      targetDocument.body.appendChild(this.containerEl);
    }
  }

  onOpen(): void {
    this.titleEl.setText(this.titleText);
    this.contentEl.addClass('quick-editing-transformation-preview');
    this.contentEl.createEl('p', {
      text: `预计影响 ${this.summary.estimatedChanges} 处（${this.summary.changedLines} 行），字符数变化 ${this.summary.characterDelta >= 0 ? '+' : ''}${this.summary.characterDelta}。`,
    });
    this.contentEl.createEl('h4', { text: '修改前' });
    this.contentEl.createEl('pre', { text: this.summary.beforePreview });
    this.contentEl.createEl('h4', { text: '修改后' });
    this.contentEl.createEl('pre', { text: this.summary.afterPreview });

    new Setting(this.contentEl)
      .addButton((button) => button
        .setButtonText('取消')
        .onClick(() => this.close()))
      .addButton((button) => button
        .setCta()
        .setButtonText('应用修改')
        .onClick(() => {
          this.close();
          this.apply();
        }));
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
