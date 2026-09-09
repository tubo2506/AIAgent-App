const STORAGE_PIN_KEY = 'gemini_studio_security_pin';
const STORAGE_PIN_ENABLED_KEY = 'gemini_studio_pin_enabled';
const DEFAULT_PIN = '1234';

export function getSecurityPin(): string {
  try {
    const pin = localStorage.getItem(STORAGE_PIN_KEY);
    if (pin && pin.trim().length >= 4) {
      return pin.trim();
    }
  } catch {}
  return DEFAULT_PIN;
}

export function isPinProtectionEnabled(): boolean {
  try {
    const val = localStorage.getItem(STORAGE_PIN_ENABLED_KEY);
    if (val !== null) {
      return val === 'true';
    }
  } catch {}
  return true; // Mặc định bật bảo vệ mã PIN
}

export function verifyPin(inputPin: string): boolean {
  if (!isPinProtectionEnabled()) return true;
  const currentPin = getSecurityPin();
  return inputPin.trim() === currentPin;
}

export function setSecurityPin(newPin: string): boolean {
  const clean = newPin.trim();
  if (clean.length < 4 || clean.length > 8) {
    return false;
  }
  try {
    localStorage.setItem(STORAGE_PIN_KEY, clean);
    return true;
  } catch {
    return false;
  }
}

export function setPinProtectionEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_PIN_ENABLED_KEY, enabled ? 'true' : 'false');
  } catch {}
}

export function resetToDefaultPin(): void {
  try {
    localStorage.setItem(STORAGE_PIN_KEY, DEFAULT_PIN);
    localStorage.setItem(STORAGE_PIN_ENABLED_KEY, 'true');
  } catch {}
}

// --- 2. System-wide Entry Lock (Cổng khóa vào hệ thống) ---
const STORAGE_SYSTEM_PASSCODE_KEY = 'gemini_studio_system_passcode';
const STORAGE_SYSTEM_LOCK_ENABLED_KEY = 'gemini_studio_system_lock_enabled';
const STORAGE_SYSTEM_AUTH_LOCAL_KEY = 'gemini_studio_system_auth_remembered';
const STORAGE_SYSTEM_AUTH_SESSION_KEY = 'gemini_studio_system_auth_session';
const DEFAULT_SYSTEM_PASSCODE = '123456';

export function getSystemPasscode(): string {
  try {
    const code = localStorage.getItem(STORAGE_SYSTEM_PASSCODE_KEY);
    if (code && code.trim().length >= 4) {
      return code.trim();
    }
  } catch {}
  return DEFAULT_SYSTEM_PASSCODE;
}

export function isSystemLockEnabled(): boolean {
  try {
    const val = localStorage.getItem(STORAGE_SYSTEM_LOCK_ENABLED_KEY);
    if (val !== null) {
      return val === 'true';
    }
  } catch {}
  return true; // Mặc định bật khóa cổng vào hệ thống
}

export function setSystemLockEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_SYSTEM_LOCK_ENABLED_KEY, enabled ? 'true' : 'false');
  } catch {}
}

export function verifySystemPasscode(inputCode: string): boolean {
  if (!isSystemLockEnabled()) return true;
  const current = getSystemPasscode();
  return inputCode.trim() === current;
}

export function setSystemPasscode(newCode: string): boolean {
  const clean = newCode.trim();
  if (clean.length < 4 || clean.length > 20) {
    return false;
  }
  try {
    localStorage.setItem(STORAGE_SYSTEM_PASSCODE_KEY, clean);
    return true;
  } catch {
    return false;
  }
}

export function isSystemAuthenticated(): boolean {
  if (!isSystemLockEnabled()) return true;
  try {
    // Kiểm tra session trước
    if (sessionStorage.getItem(STORAGE_SYSTEM_AUTH_SESSION_KEY) === 'true') {
      return true;
    }
    // Kiểm tra ghi nhớ lâu dài
    if (localStorage.getItem(STORAGE_SYSTEM_AUTH_LOCAL_KEY) === 'true') {
      return true;
    }
  } catch {}
  return false;
}

export function setSystemAuthenticated(auth: boolean, rememberDevice: boolean = false): void {
  try {
    if (auth) {
      sessionStorage.setItem(STORAGE_SYSTEM_AUTH_SESSION_KEY, 'true');
      if (rememberDevice) {
        localStorage.setItem(STORAGE_SYSTEM_AUTH_LOCAL_KEY, 'true');
      }
    } else {
      sessionStorage.removeItem(STORAGE_SYSTEM_AUTH_SESSION_KEY);
      localStorage.removeItem(STORAGE_SYSTEM_AUTH_LOCAL_KEY);
    }
  } catch {}
}

