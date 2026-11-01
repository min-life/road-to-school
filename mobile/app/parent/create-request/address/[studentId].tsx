import { useLocalSearchParams } from 'expo-router';
import { CreateAddressRequestView } from '@/components/parent/create-address-request-view';

export default function CreateAddressRequestScreen() {
  const { studentId } = useLocalSearchParams<{ studentId: string }>();
  return <CreateAddressRequestView key={studentId} fixedStudentId={studentId || ''} />;
}
