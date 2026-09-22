// 小人圖庫存在 IndexedDB（localStorage 放不下多張 gif）
import { useEffect, useState } from 'react'
import { uid } from './level'

const DB_NAME = 'daily-quest'
const STORE = 'images'

/**
 * 內建圖包的 id 前綴。內建圖不進 IndexedDB，
 * id 直接記路徑，所以備份檔只存一行字串，也不會被誤刪。
 */
const BUILTIN = 'builtin:'

export const builtinId = (path: string) => BUILTIN + path
export const isBuiltin = (id: string) => id.startsWith(BUILTIN)
export const builtinPath = (id: string) => id.slice(BUILTIN.length)

let dbPromise: Promise<IDBDatabase> | null = null

function db(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1)
      req.onupgradeneeded = () => req.result.createObjectStore(STORE)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }
  return dbPromise
}

function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return db().then(
    (d) =>
      new Promise<T>((resolve, reject) => {
        const req = fn(d.transaction(STORE, mode).objectStore(STORE))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      }),
  )
}

export async function putImage(blob: Blob, id = uid()): Promise<string> {
  await run('readwrite', (s) => s.put(blob, id))
  return id
}

export function getImage(id: string): Promise<Blob | undefined> {
  return run<Blob | undefined>('readonly', (s) => s.get(id))
}

export async function deleteImage(id: string): Promise<void> {
  if (isBuiltin(id)) return
  await run('readwrite', (s) => s.delete(id))
  const url = urls.get(id)
  if (url) {
    URL.revokeObjectURL(url)
    urls.delete(id)
  }
}

export async function listImages(): Promise<{ id: string; blob: Blob }[]> {
  const keys = await run<IDBValidKey[]>('readonly', (s) => s.getAllKeys())
  const blobs = await run<Blob[]>('readonly', (s) => s.getAll())
  return keys.map((k, i) => ({ id: String(k), blob: blobs[i] }))
}

const urls = new Map<string, string>()

export async function imageUrl(id: string): Promise<string | null> {
  if (isBuiltin(id)) return builtinPath(id)
  const cached = urls.get(id)
  if (cached) return cached
  try {
    const blob = await getImage(id)
    if (!blob) return null
    const url = URL.createObjectURL(blob)
    urls.set(id, url)
    return url
  } catch {
    return null
  }
}

const initialUrl = (id: string | null) => {
  if (!id) return null
  if (isBuiltin(id)) return builtinPath(id)
  return urls.get(id) ?? null
}

export function useImageUrl(id: string | null): string | null {
  const [url, setUrl] = useState<string | null>(() => initialUrl(id))
  useEffect(() => {
    let alive = true
    if (!id) {
      setUrl(null)
      return
    }
    if (isBuiltin(id)) {
      setUrl(builtinPath(id))
      return
    }
    imageUrl(id).then((u) => {
      if (alive) setUrl(u)
    })
    return () => {
      alive = false
    }
  }, [id])
  return url
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })
}

export function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return fetch(dataUrl).then((r) => r.blob())
}
