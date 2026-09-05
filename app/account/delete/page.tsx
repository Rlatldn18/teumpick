import PickupApp from '../../pickup-app';
export default function DeleteAccount() {
  return (
    <>
      <div className="deletion-instructions">
        <h1>틈픽 계정 삭제</h1>
        <p>
          아래에서 로그인한 뒤 <strong>마이 → 회원 탈퇴</strong>로 이동해
          비밀번호를 확인하면 계정이 삭제됩니다. 진행 중인 주문은 먼저
          취소하거나 수령을 완료해 주세요.
        </p>
      </div>
      <PickupApp />
    </>
  );
}
