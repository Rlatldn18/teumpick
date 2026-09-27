'use client';
/* eslint-disable next/no-html-link-for-pages -- Full app reset also works in the bundled native entrypoint. */
/* eslint-disable react/react-compiler -- Session restoration synchronizes with the native keystore and HTTP cookie. */
import { useEffect, useState } from 'react';
import {
  ShoppingBag,
  ArrowRight,
  ArrowLeft,
  Store,
  Eye,
  EyeOff,
  ShieldCheck,
  Copy,
  Check,
  TrainFront,
} from 'lucide-react';
import Dashboard from './dashboard';
import Modal from './modal';
import { api, restoreSession, saveSession, ApiError } from './api-client';
import type { Member } from './types';
import { LegalContent } from './legal-content';
export default function PickupApp() {
  const [view, setView] = useState('welcome'),
    [role, setRole] = useState<'buyer' | 'seller'>('buyer'),
    [member, setMember] = useState<Member | null>(null),
    [guest, setGuest] = useState(false),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [show, setShow] = useState(false),
    [recovery, setRecovery] = useState(''),
    [recoverySaved, setRecoverySaved] = useState(false),
    [legal, setLegal] = useState<'privacy' | 'terms' | null>(null),
    [copied, setCopied] = useState(false);
  useEffect(() => {
    let alive = true;
    void (async () => {
      await restoreSession();
      try {
        const data = await api<{ user: Member }>('auth/me');
        if (alive) setMember(data.user);
      } catch (e) {
        if (alive && e instanceof ApiError && e.status !== 401)
          setError(e.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  async function submit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    const f = new FormData(e.currentTarget),
      data = Object.fromEntries(f.entries());
    try {
      if (view !== 'login' && data.password !== data.confirm)
        throw new Error('비밀번호가 서로 일치하지 않아요.');
      const path =
        view === 'login'
          ? 'auth/login'
          : view === 'reset'
            ? 'auth/reset'
            : 'auth/register';
      const result = await api<{
        user?: Member;
        token?: string;
        recoveryCode?: string;
      }>(path, { ...data, role, acceptTerms: f.get('acceptTerms') === 'on' });
      if (result.user) {
        await saveSession(result.token);
        setMember(result.user);
      }
      if (result.recoveryCode) {
        setRecovery(result.recoveryCode);
        setRecoverySaved(false);
      }
      if (view === 'reset') setView('login');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    try {
      if (!guest) await api('auth/logout', {});
      await saveSession();
      setGuest(false);
      setMember(null);
      setView('welcome');
      setError('');
    } catch (e) {
      await saveSession();
      setError((e as Error).message);
      setMember(null);
      setGuest(false);
      setView('welcome');
    }
  }
  const recoveryModal = recovery && (
    <Modal label="recovery-title" onClose={() => {}}>
      <section className="modal compact recovery-panel">
        <ShieldCheck size={34} className="green" />
        <h2 id="recovery-title">계정 복구 코드를 보관해 주세요</h2>
        <p>
          비밀번호를 잊었을 때 필요한 코드예요.
          <br />
          지금 한 번만 표시되니 안전한 곳에 저장해 주세요.
        </p>
        <code>{recovery}</code>
        <button
          className="secondary full"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(recovery);
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}
        >
          {copied ? <Check size={17} /> : <Copy size={17} />}{' '}
          {copied ? '복사했어요' : '복구 코드 복사'}
        </button>
        <label className="consent">
          <input
            type="checkbox"
            checked={recoverySaved}
            onChange={(e) => setRecoverySaved(e.target.checked)}
          />
          복구 코드를 안전한 곳에 보관했어요
        </label>
        <button
          className="primary full"
          disabled={!recoverySaved}
          onClick={() => {
            setRecovery('');
            setCopied(false);
          }}
        >
          계속하기 <ArrowRight size={17} />
        </button>
      </section>
    </Modal>
  );
  if (loading)
    return (
      <main className="app-loading">
        <span className="brand-icon">
          <ShoppingBag />
        </span>
        <strong>틈픽</strong>
        <p>내 계정을 확인하고 있어요</p>
      </main>
    );
  if (member || guest)
    return (
      <>
        <Dashboard
          role={member?.role ?? role}
          setRole={setRole as (r: string) => void}
          demo={guest}
          name={member?.name ?? '둘러보는 중'}
          member={member}
          exit={() => void logout()}
        />
        {recoveryModal}
      </>
    );
  return (
    <div className="auth-app">
      <header className="auth-header">
        {view === 'welcome' ? (
          <a className="brand" href="/">
            <span className="brand-icon">
              <ShoppingBag size={22} />
            </span>
            틈픽
          </a>
        ) : (
          <button
            aria-label="이전 화면"
            onClick={() => {
              setView('welcome');
              setError('');
            }}
          >
            <ArrowLeft />
          </button>
        )}
        <span>
          {view === 'welcome'
            ? '환승길 스마트 픽업'
            : view === 'login'
              ? '로그인'
              : view === 'reset'
                ? '비밀번호 재설정'
                : '회원가입'}
        </span>
      </header>
      <main className="auth-content">
        {view === 'welcome' ? (
          <>
            <div className="auth-eyebrow">
              <span className="line-badge">1</span>
              <span className="line-badge line2">2</span> 신도림 · 영등포
            </div>
            <h1>
              환승하는 틈에,
              <br />
              맛있는 한 끼<span className="green">.</span>
            </h1>
            <p className="auth-lead">미리 주문하고, 내 동선에서 픽업하세요.</p>
            <div className="auth-ticket">
              <div>
                <ShoppingBag />
                <span>주문</span>
              </div>
              <i />
              <div>
                <Store />
                <span>준비</span>
              </div>
              <i />
              <div>
                <TrainFront />
                <span>픽업</span>
              </div>
            </div>
            <h2 className="choose-heading">어떤 계정으로 시작할까요?</h2>
            <div className="role-options">
              <button
                className="role-card selected"
                onClick={() => {
                  setRole('buyer');
                  setView('signup');
                  setError('');
                }}
              >
                <ShoppingBag />
                <div>
                  <strong>구매자 회원가입</strong>
                  <span>내 환승길에 맞는 한 끼를 찾아요</span>
                </div>
                <ArrowRight size={20} />
              </button>
              <button
                className="role-card"
                onClick={() => {
                  setRole('seller');
                  setView('signup');
                  setError('');
                }}
              >
                <Store />
                <div>
                  <strong>판매자 회원가입</strong>
                  <span>우리 가게의 주문과 픽업을 관리해요</span>
                </div>
                <ArrowRight size={20} />
              </button>
            </div>
            <button
              className="secondary full"
              onClick={() => {
                setView('login');
                setError('');
              }}
            >
              이미 계정이 있어요 · 로그인
            </button>
            <button
              className="browse-link"
              onClick={() => {
                setRole('buyer');
                setGuest(true);
              }}
            >
              회원가입 전에 둘러보기 <ArrowRight size={14} />
            </button>
            <p className="auth-footnote">
              주문·픽업 서비스는 현재 시험 운영 준비 중입니다.
            </p>
          </>
        ) : (
          <>
            <div className="section-kicker">
              {view === 'login'
                ? 'WELCOME BACK'
                : view === 'reset'
                  ? 'ACCOUNT RECOVERY'
                  : role === 'seller'
                    ? 'TEUMPICK PARTNER'
                    : 'YOUR NEXT PICKUP'}
            </div>
            <h1>
              {view === 'login'
                ? '다시 만나 반가워요'
                : view === 'reset'
                  ? '새 비밀번호를 설정해요'
                  : role === 'seller'
                    ? '우리 가게, 틈픽과 함께'
                    : '틈픽과 함께 시작해요'}
            </h1>
            <p className="auth-lead">
              {view === 'reset'
                ? '가입 시 보관한 복구 코드가 필요해요.'
                : view === 'login'
                  ? '가입한 이메일로 로그인해 주세요.'
                  : role === 'seller'
                    ? '판매자 계정과 매장 정보를 등록해 주세요.'
                    : '회원가입 후 주문 현황을 편하게 확인하세요.'}
            </p>
            <form className="auth-form" onSubmit={submit} key={view + role}>
              {view === 'signup' && (
                <label>
                  이름
                  <input
                    name="name"
                    required
                    minLength={2}
                    maxLength={40}
                    autoComplete="name"
                    placeholder="이름을 입력해 주세요"
                  />
                </label>
              )}
              <label>
                이메일
                <input
                  name="email"
                  type="email"
                  required
                  maxLength={254}
                  autoComplete="email"
                  autoCapitalize="none"
                  placeholder="hello@example.com"
                />
              </label>
              {view === 'reset' && (
                <label>
                  계정 복구 코드
                  <input
                    name="recoveryCode"
                    required
                    minLength={64}
                    maxLength={64}
                    autoComplete="off"
                    placeholder="가입 시 받은 64자리 코드"
                  />
                </label>
              )}
              <label>
                {view === 'reset' ? '새 비밀번호' : '비밀번호'}
                <span className="password-field">
                  <input
                    name="password"
                    type={show ? 'text' : 'password'}
                    required
                    minLength={view === 'login' ? 1 : 10}
                    maxLength={128}
                    autoComplete={
                      view === 'login' ? 'current-password' : 'new-password'
                    }
                    placeholder="10자 이상 입력해 주세요"
                  />
                  <button
                    type="button"
                    aria-label={show ? '비밀번호 숨기기' : '비밀번호 보기'}
                    onClick={() => setShow(!show)}
                  >
                    {show ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </span>
              </label>
              {view !== 'login' && (
                <label>
                  비밀번호 확인
                  <input
                    name="confirm"
                    type="password"
                    required
                    minLength={10}
                    maxLength={128}
                    autoComplete="new-password"
                    placeholder="비밀번호를 한 번 더 입력해 주세요"
                  />
                </label>
              )}
              {view === 'signup' && role === 'seller' && (
                <fieldset>
                  <legend>매장 정보</legend>
                  <label>
                    매장 이름
                    <input
                      name="storeName"
                      required
                      maxLength={60}
                      placeholder="예: 그린테이블 신도림점"
                    />
                  </label>
                  <label>
                    픽업 역
                    <select name="station">
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
                      autoComplete="street-address"
                      placeholder="매장 도로명 주소"
                    />
                  </label>
                  <p className="muted">
                    가입 후 대표 메뉴를 등록하고 주문 접수를 켤 수 있어요.
                  </p>
                </fieldset>
              )}
              {view === 'signup' && (
                <div className="consent-block">
                  <label className="consent">
                    <input name="acceptTerms" type="checkbox" required />
                    <span>
                      만 14세 이상이며 이용 안내와 개인정보 안내를 확인했어요.
                      (필수)
                    </span>
                  </label>
                  <div>
                    <button type="button" onClick={() => setLegal('terms')}>
                      이용 안내 보기
                    </button>
                    <button type="button" onClick={() => setLegal('privacy')}>
                      개인정보 안내 보기
                    </button>
                  </div>
                </div>
              )}
              {error && (
                <p role="alert" className="error">
                  {error}
                </p>
              )}
              <button className="primary full" disabled={busy}>
                {busy
                  ? '처리하고 있어요…'
                  : view === 'login'
                    ? '로그인'
                    : view === 'reset'
                      ? '비밀번호 변경'
                      : `${role === 'seller' ? '판매자' : '구매자'} 회원가입`}
                <ArrowRight size={17} />
              </button>
              {view === 'login' && (
                <button
                  className="browse-link"
                  type="button"
                  onClick={() => {
                    setView('reset');
                    setError('');
                  }}
                >
                  비밀번호를 잊으셨나요?
                </button>
              )}
            </form>
          </>
        )}
        {error && view === 'welcome' && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </main>
      {recoveryModal}
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
    </div>
  );
}

