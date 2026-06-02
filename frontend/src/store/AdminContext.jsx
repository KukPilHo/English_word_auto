/**
 * AdminContext — 임시 관리자 모드
 *
 * 진입: URL에 ?admin=<비밀코드> 를 붙이면 서버(/api/admin/verify)가 환경변수
 *       ADMIN_CODE와 대조해 통과 시 localStorage에 플래그를 저장한다.
 *       이후엔 코드 없이 접속해도 관리자 상태가 유지된다.
 * 종료: exitAdmin() 호출 (사이드바 하단 버튼).
 *
 * ⚠️ 추후 구글 계정 화이트리스트 인증으로 교체할 때는 이 파일의 isAdmin 판정부만
 *    교체하면 된다. 나머지 코드는 useAdmin().isAdmin 만 바라본다.
 */

import { createContext, useContext, useState, useEffect } from 'react';

const AdminContext = createContext(null);
const STORAGE_KEY = 'summit_admin';

/** HashRouter 환경이라 ?admin= 가 해시 앞/뒤 어디든 올 수 있어 둘 다 본다 */
function readAdminCode() {
  const searchVal = new URLSearchParams(window.location.search).get('admin');
  if (searchVal) return searchVal;

  const hash = window.location.hash;
  const qIdx = hash.indexOf('?');
  if (qIdx !== -1) {
    const hashVal = new URLSearchParams(hash.slice(qIdx + 1)).get('admin');
    if (hashVal) return hashVal;
  }
  return null;
}

/** 진입 후 URL에서 admin 코드를 제거해 북마크/공유에 안 남게 한다 */
function cleanAdminFromUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete('admin');

  let hash = url.hash;
  const qIdx = hash.indexOf('?');
  if (qIdx !== -1) {
    const hp = new URLSearchParams(hash.slice(qIdx + 1));
    hp.delete('admin');
    const rest = hp.toString();
    hash = hash.slice(0, qIdx) + (rest ? `?${rest}` : '');
  }
  url.hash = hash;
  window.history.replaceState({}, '', url.toString());
}

export function AdminProvider({ children }) {
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem(STORAGE_KEY) === '1');

  useEffect(() => {
    const code = readAdminCode();
    if (!code) return;

    cleanAdminFromUrl();

    fetch('/api/admin/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.ok) {
          localStorage.setItem(STORAGE_KEY, '1');
          setIsAdmin(true);
        }
      })
      .catch(() => {});
  }, []);

  const exitAdmin = () => {
    localStorage.removeItem(STORAGE_KEY);
    setIsAdmin(false);
  };

  return (
    <AdminContext.Provider value={{ isAdmin, exitAdmin }}>
      {children}
    </AdminContext.Provider>
  );
}

export const useAdmin = () => useContext(AdminContext);
