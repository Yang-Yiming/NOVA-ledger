/**
 * 浏览器侧解密:与 scripts/encrypt.ts 互为逆操作。
 * PBKDF2-SHA256 派生密钥 + AES-256-GCM。
 */

export interface EncPayload {
  salt: string
  iv: string
  ct: string
  iter: number
}

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(new ArrayBuffer(hex.length / 2))
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

const encoder = new TextEncoder()

/** 密码错误 / 密文损坏时 reject */
export async function decryptPayload(payload: EncPayload, password: string): Promise<string> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password.normalize('NFKC')),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: hexToBytes(payload.salt), iterations: payload.iter, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  )
  try {
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: hexToBytes(payload.iv) },
      key,
      hexToBytes(payload.ct),
    )
    return new TextDecoder().decode(plain)
  } catch {
    throw new Error('密码错误')
  }
}
