import { Redirect } from 'expo-router';

/** Compatibility for the former standalone student-selection route. */
export default function SelectStudentRedirect() {
  return <Redirect href="/parent/change-stop/create" />;
}
