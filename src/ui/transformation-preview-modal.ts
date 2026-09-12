import { App, Modal, Setting } from 'obsidian';

import type { TransformationSummary } from '../transformations/preview';
import { t } from '../i18n';

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
      text: t('preview.summary', {
        changes: this.summary.estimatedChanges,
        lines: this.summary.changedLines,
        delta: `${this.summary.characterDelta >= 0 ? '+' : ''}${this.summary.characterDelta}`,
      }),
    });
    this.contentEl.createEl('h4', { text: t('preview.before') });
    this.contentEl.createEl('pre', { text: this.summary.beforePreview });
    this.contentEl.createEl('h4', { text: t('preview.after') });
    this.contentEl.createEl('pre', { text: this.summary.afterPreview });

    new Setting(this.contentEl)
      .addButton((button) => button
        .setButtonText(t('preview.cancel'))
        .onClick(() => this.close()))
      .addButton((button) => button
        .setCta()
        .setButtonText(t('preview.apply'))
        .onClick(() => {
          this.close();
          this.apply();
        }));
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
