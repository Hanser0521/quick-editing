import type { TExternalFile, TFile, Vault } from 'obsidian';

export function isVaultNote(
  file: TFile | null | undefined,
  vault: Pick<Vault, 'getFileByPath'>,
  externalFileType?: typeof TExternalFile,
): file is TFile {
  if (!file) return false;
  if (typeof externalFileType === 'function' && file instanceof externalFileType) return false;
  // 1.14.2–1.14.3 did not yet export TExternalFile. Their external paths still
  // use file: URLs; getFileByPath() resolves those too, so identity is not enough.
  if (/^(?:file:|\/|[A-Za-z]:[\\/])/i.test(file.path)) return false;
  return vault.getFileByPath(file.path) === file;
}
