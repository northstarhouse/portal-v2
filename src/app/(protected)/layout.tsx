import PasswordGate from '@/components/PasswordGate'

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return <PasswordGate>{children}</PasswordGate>
}
