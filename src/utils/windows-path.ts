const DRIVE_PATH = /^([A-Za-z]):\\([^\0<>:"|?*]+)$/;
const UNC_PATH = /^\\\\([^\\\s]+)\\([^\0<>:"|?*]+)$/;

function encodePathSegments(value: string): string {
  return value.split('\\').map((segment) =>
    encodeURIComponent(segment).replace(/[!'()*]/g, (character) =>
      `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
    )
  ).join('/');
}

function decodePathname(value: string): string | null {
  try {
    return decodeURIComponent(value).replace(/\//g, '\\');
  } catch {
    return null;
  }
}

export function isWindowsPath(value: string): boolean {
  return DRIVE_PATH.test(value) || UNC_PATH.test(value);
}

export function windowsPathToFileUrl(value: string): string | null {
  const driveMatch = DRIVE_PATH.exec(value);
  if (driveMatch) {
    return `file:///${driveMatch[1]?.toUpperCase()}:/${encodePathSegments(driveMatch[2] ?? '')}`;
  }

  const uncMatch = UNC_PATH.exec(value);
  if (uncMatch) {
    return `file://${uncMatch[1]}/${encodePathSegments(uncMatch[2] ?? '')}`;
  }
  return null;
}

export function fileUrlToWindowsPath(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'file:') return null;
    const decodedPath = decodePathname(url.pathname.replace(/^\//, ''));
    if (decodedPath === null) return null;
    if (url.hostname && url.hostname !== 'localhost') {
      return `\\\\${decodeURIComponent(url.hostname)}\\${decodedPath}`;
    }
    return /^[A-Za-z]:\\/.test(decodedPath) ? decodedPath : null;
  } catch {
    return null;
  }
}

function markdownDestination(value: string): string | null {
  const match = /^!?\[[^\]\r\n]*\]\(\s*(?:<([^>\r\n]+)>|([^\r\n)]+))\s*\)$/.exec(value);
  return (match?.[1] ?? match?.[2])?.trim() ?? null;
}

export function convertWindowsPathSyntax(value: string): string | null {
  const trimmed = value.trim();
  const fileUrl = windowsPathToFileUrl(trimmed);
  if (fileUrl) return `[file](${fileUrl})`;

  const destination = markdownDestination(trimmed) ?? trimmed;
  if (isWindowsPath(destination)) return destination;
  return fileUrlToWindowsPath(destination);
}
