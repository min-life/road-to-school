/** The current Leave OTP endpoint reports its wait in this exact message (HTTP400). */
export function parseLeaveOtpWaitSeconds(message: unknown): number | null {
  if (typeof message !== 'string') return null;
  const match = /^Vui lòng chờ\s+(\d+)\s+giây trước khi yêu cầu mã xác thực mới[.!]?$/iu.exec(message.trim());
  if (!match) return null;
  const seconds = Number(match[1]);
  return Number.isSafeInteger(seconds) && seconds > 0 && Number.isSafeInteger(seconds * 1000)
    ? seconds : null;
}

export function otpCooldownDeadline(seconds: number, now: number): number | null {
  const deadline = now + seconds * 1000;
  return Number.isSafeInteger(seconds) && seconds > 0 && Number.isSafeInteger(now)
    && Number.isSafeInteger(deadline) ? deadline : null;
}

export function otpCooldownSecondsLeft(deadline: number, now: number): number {
  return Number.isFinite(deadline) && Number.isFinite(now)
    ? Math.max(0, Math.ceil((deadline - now) / 1000)) : 0;
}
