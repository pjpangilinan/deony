/**
 * Web share and clipboard copy utilities for Deony
 */

export interface ShareOptions {
  title: string;
  text?: string;
  url: string;
}

/**
 * Share content using the Web Share API if available, falling back to clipboard copy.
 * Returns true if shared or copied successfully.
 */
export async function shareContent(options: ShareOptions): Promise<'shared' | 'copied' | 'failed'> {
  const { title, text, url } = options;

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title,
        text,
        url,
      });
      return 'shared';
    } catch (err: unknown) {
      // If user aborted or dismissed share sheet, don't fall back to clipboard
      if (err instanceof Error && err.name === 'AbortError') {
        return 'failed';
      }
      // Otherwise fall back to clipboard
    }
  }

  // Fallback to clipboard
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(url);
      return 'copied';
    } catch {
      // Fallback for older browsers
    }
  }

  // Final fallback using textarea
  try {
    const textArea = document.createElement('textarea');
    textArea.value = url;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful ? 'copied' : 'failed';
  } catch {
    return 'failed';
  }
}

/**
 * Copy text to clipboard with fallback.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to fallback
    }
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch {
    return false;
  }
}
