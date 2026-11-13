export const IOT_CONNECTION = 'iot';
export const IOT_DATABASE = 'road_to_school_iot';

export function isIotEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.IOT_ENABLED?.trim().toLowerCase() === 'true';
}
