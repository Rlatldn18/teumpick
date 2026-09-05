'use client';
import { useEffect, useState } from 'react';
import {
  UserRound,
  LogOut,
  ShieldCheck,
  Trash2,
  ChevronRight,
  Store,
} from 'lucide-react';
import { api } from './api-client';
import type { Member } from './types';
import Modal from './modal';
import { LegalContent } from './legal-content';
export default function AccountPanel({
  member,
  exit,
}: {
  member: Member | null;
  exit: () => void;
}) {
  const [legal, setLegal] = useState<'privacy' | 'terms' | null>(null),
    [deleting, setDeleting] = useState(false),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  return (
    <section className="account-panel">
      <h1>마이페이지</h1>
      <div className="profile-card">
        <div className="profile-avatar">
          <UserRound size={27} />
        </div>
        <h2>{member?.name ?? '둘러보는 중'}</h2>
        <p>{member?.email ?? '회원가입하면 내 주문이 저장돼요.'}</p>
        <span className="status">
          {member?.role === 'seller' ? '판매자' : '구매자'}
        </span>
      </div>
      <div className="account-links">
        <button onClick={() => setLegal('privacy')}>
          <ShieldCheck size={19} />
          개인정보 안내
          <ChevronRight size={18} />
        </button>
        <button onClick={() => setLegal('terms')}>
          <Store size={19} />
          서비스 이용 안내
          <ChevronRight size={18} />
        </button>
        <button onClick={exit}>
          <LogOut size={19} />
          {member ? '로그아웃' : '회원가입 · 로그인'}
          <ChevronRight size={18} />
        </button>
        {member && (
          <button className="danger-text" onClick={() => setDeleting(true)}>
            <Trash2 size={19} />
            회원 탈퇴
            <ChevronRight size={18} />
          </button>
        )}
      </div>
      <p className="version-note">
        틈픽 0.2.0 · Android
        <br />
        결제·보관함 연동 준비 중
      </p>
      {legal && (
        <Modal label="legal-title" onClose={() => setLegal(null)}>
          <section className="modal legal-modal">
            <LegalContent type={legal} />
            <button className="primary full" onClick={() => setLegal(null)}>
              확인
            </button>
          </section>
        </Modal>
      )}
      {deleting && (
        <Modal
          label="delete-title"
          onClose={() => {
            if (!busy) setDeleting(false);
          }}
        >
          <form
            className="modal compact"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError('');
              try {
                await api('account/delete', {
                  password: new FormData(e.currentTarget).get('password'),
                });
                exit();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Trash2 className="danger-text" />
            <h2 id="delete-title">계정을 삭제할까요?</h2>
            <p>
              계정과 로그인 정보는 삭제되고 되돌릴 수 없어요. 완료 주문은 개인과
              연결되지 않도록 처리됩니다. 진행 중인 주문은 먼저 처리해 주세요.
            </p>
            <input
              aria-label="현재 비밀번호"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="현재 비밀번호"
            />
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button className="danger-button full" disabled={busy}>
              확인하고 계정 삭제
            </button>
            <button
              type="button"
              className="secondary full"
              disabled={busy}
              onClick={() => setDeleting(false)}
            >
              돌아가기
            </button>
          </form>
        </Modal>
      )}
    </section>
  );
}
export function MerchantPanel({ onSaved }: { onSaved: () => void }) {
  const [form, setForm] = useState<Record<string, unknown> | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(false);
  useEffect(() => {
    void api<Record<string, unknown>>('merchant')
      .then(setForm)
      .catch((e) => setError(e.message));
  }, []);
  async function submit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setSaved(false);
    const f = new FormData(e.currentTarget);
    try {
      await api('merchant', {
        ...Object.fromEntries(f.entries()),
        price: Number(f.get('price')),
        minutes: Number(f.get('minutes')),
        open: f.get('open') === 'on',
      });
      setSaved(true);
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <h1>내 매장 관리</h1>
      <p className="muted">대표 메뉴와 픽업 준비 시간을 설정해 주세요.</p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {form ? (
        <form className="merchant-form auth-form" onSubmit={submit}>
          <label>
            매장 이름
            <input
              name="name"
              required
              defaultValue={String(form.name)}
              maxLength={60}
            />
          </label>
          <label>
            픽업 역
            <select name="station" defaultValue={String(form.station)}>
              <option>신도림</option>
              <option>영등포</option>
            </select>
          </label>
          <label>
            매장 주소
            <input
              name="address"
              required
              minLength={5}
              maxLength={150}
              defaultValue={String(form.address)}
            />
          </label>
          <label>
            대표 메뉴
            <input
              name="menu"
              required
              maxLength={80}
              placeholder="예: 직화 불고기 덮밥"
              defaultValue={String(form.menu)}
            />
          </label>
          <label>
            메뉴 설명
            <input
              name="description"
              maxLength={200}
              defaultValue={String(form.description)}
              placeholder="메뉴를 간단히 소개해 주세요"
            />
          </label>
          <label>
            카테고리
            <select name="category" defaultValue={String(form.category)}>
              {['한식', '샐러드', '샌드위치', '커피·음료'].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <div className="form-columns">
            <label>
              가격 (원)
              <input
                name="price"
                type="number"
                min={100}
                max={1000000}
                step={100}
                required
                defaultValue={Number(form.price) || undefined}
              />
            </label>
            <label>
              준비 시간 (분)
              <input
                name="minutes"
                type="number"
                min={5}
                max={120}
                required
                defaultValue={Number(form.minutes)}
              />
            </label>
          </div>
          <label className="store-toggle" aria-label="주문 접수 활성화">
            <span>
              <strong>주문 접수</strong>
              <small>켜면 구매자에게 매장이 표시돼요</small>
            </span>
            <input name="open" type="checkbox" defaultChecked={!!form.open} />
          </label>
          <p className="muted">
            현재 시범 주문만 가능합니다. 실제 결제는 연결 전이에요.
          </p>
          {saved && (
            <output className="success-message">매장 정보를 저장했어요.</output>
          )}
          <button className="primary full" disabled={busy}>
            {busy ? '저장 중…' : '매장 정보 저장'}
          </button>
        </form>
      ) : (
        !error && <p className="loading-note">매장 정보를 불러오고 있어요…</p>
      )}
    </section>
  );
}
