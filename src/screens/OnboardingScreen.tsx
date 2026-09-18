import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { radius, spacing, typeScale } from '../theme/tokens';
import { TButton } from '../components/TButton';
import { DynamicGradient } from '../components/DynamicGradient';
import { GrainOverlay } from '../components/AmbientBackground';
import { Icon } from '../components/icons';
import { useStore } from '../store/useStore';
import { isValidUsername } from '../lib/types';

type Flow = 'welcome' | 'account' | 'profile' | 'contact' | 'verify';
type AuthMode = 'signup' | 'login';

const signupSteps: Flow[] = ['account', 'profile', 'contact', 'verify'];
const loginSteps: Flow[] = ['account', 'contact', 'verify'];

export function OnboardingScreen() {
  const { palette, mode } = useTheme();
  const complete = useStore((s) => s.completeOnboarding);
  const taken = useStore((s) => s.usernameTaken);
  const [flow, setFlow] = useState<Flow>('welcome');
  const [authMode, setAuthMode] = useState<AuthMode>('signup');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const usernameValue = username.trim().toLowerCase();
  const currentSteps = authMode === 'signup' ? signupSteps : loginSteps;
  const stepIndex = currentSteps.indexOf(flow);
  const progress = flow === 'welcome' ? 0 : (stepIndex + 1) / currentSteps.length;
  const isLogin = authMode === 'login';
  const isDark = mode === 'dark';

  const fieldStyle = useMemo(
    () => ({
      color: palette.textPrimary,
      backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.78)',
      borderColor: error ? palette.bad : isDark ? 'rgba(255,255,255,0.10)' : palette.hairline ?? 'transparent',
    }),
    [error, isDark, palette],
  );

  const goTo = (next: Flow) => {
    setError('');
    setFlow(next);
  };

  const validateCurrentStep = () => {
    if (flow === 'account') {
      if (!usernameValue || !isValidUsername(usernameValue)) {
        setError('Use 3-24 lowercase characters, numbers, dots, dashes or underscores.');
        return false;
      }
      if (!isLogin && taken(usernameValue)) {
        setError('That username is already taken. Try another one.');
        return false;
      }
    }
    if (flow === 'profile' && !name.trim()) {
      setError('Add your name so people know it is you.');
      return false;
    }
    if (flow === 'contact' && phone.replace(/\D/g, '').length < 7) {
      setError('Enter a valid phone number to continue.');
      return false;
    }
    if (flow === 'verify' && code.trim().length < 4) {
      setError('Enter the 6-digit code we sent you.');
      return false;
    }
    return true;
  };

  const next = () => {
    if (!validateCurrentStep()) return;
    if (flow === 'verify') {
      complete(name.trim() || 'You', usernameValue, phone);
      return;
    }
    const nextStep = currentSteps[stepIndex + 1];
    if (nextStep) goTo(nextStep);
  };

  const startAuth = (nextMode: AuthMode) => {
    setAuthMode(nextMode);
    setError('');
    setFlow('account');
  };

  return (
    <DynamicGradient kind="hero" style={styles.root}>
      <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.safe}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.shell}>
              <View style={styles.brandRow}>
                <View style={[styles.brandMark, { backgroundColor: palette.ember }]}>
                  <Text style={styles.brandMarkText}>t</Text>
                </View>
                <Text style={[styles.brand, { color: palette.textPrimary }]}>tangent</Text>
                <View style={styles.liveDot} />
              </View>

              {flow !== 'welcome' ? (
                <View style={styles.progressArea}>
                  <Pressable onPress={() => goTo(flow === 'account' ? 'welcome' : currentSteps[stepIndex - 1] ?? 'account')} hitSlop={10}>
                    <Icon name="back" size={22} color={palette.textPrimary} />
                  </Pressable>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: palette.ember }]} />
                  </View>
                  <Text style={[styles.stepCount, { color: palette.textSecondary }]}>{stepIndex + 1}/{currentSteps.length}</Text>
                </View>
              ) : null}

              {flow === 'welcome' ? (
                <Welcome palette={palette} onSignup={() => startAuth('signup')} onLogin={() => startAuth('login')} />
              ) : (
                <View style={styles.formArea}>
                  <Text style={[styles.eyebrow, { color: palette.ember }]}>{isLogin ? 'WELCOME BACK' : 'CREATE YOUR SPACE'}</Text>
                  {flow === 'account' ? (
                    <AccountStep palette={palette} mode={mode} authMode={authMode} username={username} setUsername={setUsername} />
                  ) : null}
                  {flow === 'profile' ? (
                    <ProfileStep palette={palette} name={name} setName={setName} />
                  ) : null}
                  {flow === 'contact' ? (
                    <ContactStep palette={palette} phone={phone} setPhone={setPhone} authMode={authMode} />
                  ) : null}
                  {flow === 'verify' ? (
                    <VerifyStep palette={palette} phone={phone} code={code} setCode={setCode} />
                  ) : null}
                  {error ? <Text style={[styles.error, { color: palette.bad }]}>{error}</Text> : null}
                  <TButton title={flow === 'verify' ? 'Enter Tangent' : 'Continue'} onPress={next} />
                  {flow === 'account' ? (
                    <Pressable onPress={() => startAuth(isLogin ? 'signup' : 'login')} style={styles.switchMode}>
                      <Text style={[styles.switchText, { color: palette.textSecondary }]}>
                        {isLogin ? 'New to Tangent? ' : 'Already have an account? '}
                        <Text style={{ color: palette.ember, fontWeight: '600' }}>{isLogin ? 'Sign up' : 'Log in'}</Text>
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <GrainOverlay opacity={0.055} />
    </DynamicGradient>
  );
}

function Welcome({ palette, onSignup, onLogin }: { palette: ReturnType<typeof useTheme>['palette']; onSignup: () => void; onLogin: () => void }) {
  return (
    <View style={styles.welcomeArea}>
      <View style={styles.signalArt}>
        <View style={[styles.signalRing, styles.ringOuter, { borderColor: palette.ember }]} />
        <View style={[styles.signalRing, styles.ringMiddle, { borderColor: palette.ember }]} />
        <View style={[styles.signalRing, styles.ringInner, { borderColor: palette.ember }]} />
        <View style={[styles.signalCore, { backgroundColor: palette.ember }]}>
          <Icon name="chat" size={28} color={palette.onAccent} strokeWidth={2} />
        </View>
      </View>
      <Text style={[styles.heroTitle, { color: palette.textPrimary }]}>Conversation,{'\n'}without the noise.</Text>
      <Text style={[styles.heroBody, { color: palette.textSecondary }]}>A calmer place for the people and thoughts you want close.</Text>
      <View style={styles.promiseRow}>
        <Promise icon="shield" label="Private by design" palette={palette} />
        <Promise icon="clock" label="Works on weak signal" palette={palette} />
      </View>
      <View style={styles.actions}>
        <TButton title="Create an account" onPress={onSignup} />
        <TButton title="I already have an account" onPress={onLogin} variant="ghost" />
      </View>
      <Text style={[styles.legal, { color: palette.textSecondary }]}>By continuing, you agree to Tangent's terms and privacy promise.</Text>
    </View>
  );
}

function Promise({ icon, label, palette }: { icon: 'shield' | 'clock'; label: string; palette: ReturnType<typeof useTheme>['palette'] }) {
  return (
    <View style={styles.promise}>
      <Icon name={icon} size={17} color={palette.ember} />
      <Text style={[styles.promiseText, { color: palette.textSecondary }]}>{label}</Text>
    </View>
  );
}

function AccountStep({ palette, mode, authMode, username, setUsername }: { palette: ReturnType<typeof useTheme>['palette']; mode: 'light' | 'dark'; authMode: AuthMode; username: string; setUsername: (value: string) => void }) {
  return (
    <>
      <Text style={[styles.formTitle, { color: palette.textPrimary }]}>{authMode === 'login' ? 'Good to see you.' : 'Your identity, your way.'}</Text>
      <Text style={[styles.formBody, { color: palette.textSecondary }]}>{authMode === 'login' ? 'Enter your Tangent username to pick up where you left off.' : 'Choose a username people can use to find you. No phone number required to connect.'}</Text>
      <FieldLabel text="USERNAME" palette={palette} />
      <TextInput value={username} onChangeText={(value) => setUsername(value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))} placeholder="your.name" autoCapitalize="none" autoCorrect={false} placeholderTextColor={palette.textSecondary} style={[styles.input, { color: palette.textPrimary, backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.78)', borderColor: mode === 'dark' ? 'rgba(255,255,255,0.10)' : palette.hairline ?? 'transparent' }]} autoFocus />
      <Text style={[styles.inputHint, { color: palette.textSecondary }]}>Lowercase letters, numbers, . _ -</Text>
    </>
  );
}

function ProfileStep({ palette, name, setName }: { palette: ReturnType<typeof useTheme>['palette']; name: string; setName: (value: string) => void }) {
  return (
    <>
      <Text style={[styles.formTitle, { color: palette.textPrimary }]}>What should we call you?</Text>
      <Text style={[styles.formBody, { color: palette.textSecondary }]}>Your display name is what friends will see in their chats.</Text>
      <FieldLabel text="DISPLAY NAME" palette={palette} />
      <TextInput value={name} onChangeText={setName} placeholder="Maya Singh" placeholderTextColor={palette.textSecondary} style={[styles.input, { color: palette.textPrimary, backgroundColor: palette.glass, borderColor: palette.hairline ?? 'transparent' }]} autoFocus />
    </>
  );
}

function ContactStep({ palette, phone, setPhone, authMode }: { palette: ReturnType<typeof useTheme>['palette']; phone: string; setPhone: (value: string) => void; authMode: AuthMode }) {
  return (
    <>
      <Text style={[styles.formTitle, { color: palette.textPrimary }]}>{authMode === 'login' ? 'One quick check.' : 'Add a recovery number.'}</Text>
      <Text style={[styles.formBody, { color: palette.textSecondary }]}>We will send a one-time code to confirm this number. It stays private.</Text>
      <FieldLabel text="PHONE NUMBER" palette={palette} />
      <TextInput value={phone} onChangeText={setPhone} placeholder="+1 555 012 3456" keyboardType="phone-pad" placeholderTextColor={palette.textSecondary} style={[styles.input, { color: palette.textPrimary, backgroundColor: palette.glass, borderColor: palette.hairline ?? 'transparent' }]} autoFocus />
      <View style={styles.privateNote}><Icon name="lock" size={15} color={palette.ember} /><Text style={[styles.inputHint, { color: palette.textSecondary }]}>Only used for account security</Text></View>
    </>
  );
}

function VerifyStep({ palette, phone, code, setCode }: { palette: ReturnType<typeof useTheme>['palette']; phone: string; code: string; setCode: (value: string) => void }) {
  return (
    <>
      <Text style={[styles.formTitle, { color: palette.textPrimary }]}>Check your messages.</Text>
      <Text style={[styles.formBody, { color: palette.textSecondary }]}>We sent a 6-digit confirmation code to {phone || 'your phone'}.</Text>
      <FieldLabel text="CONFIRMATION CODE" palette={palette} />
      <TextInput value={code} onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" keyboardType="number-pad" placeholderTextColor={palette.textSecondary} style={[styles.input, styles.codeInput, { color: palette.textPrimary, backgroundColor: palette.glass, borderColor: palette.hairline ?? 'transparent' }]} autoFocus maxLength={6} />
      <Pressable><Text style={[styles.resend, { color: palette.ember }]}>Resend code</Text></Pressable>
    </>
  );
}

function FieldLabel({ text, palette }: { text: string; palette: ReturnType<typeof useTheme>['palette'] }) {
  return <Text style={[styles.fieldLabel, { color: palette.textSecondary }]}>{text}</Text>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
  shell: { width: '100%', maxWidth: 520, alignSelf: 'center', flexGrow: 1 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xl },
  brandMark: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  brandMarkText: { color: '#fff', fontSize: 21, fontWeight: '700' },
  brand: { fontSize: 17, fontWeight: '700', letterSpacing: 0.2 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#59C890', marginLeft: 2 },
  welcomeArea: { flexGrow: 1, justifyContent: 'center', paddingVertical: spacing.xl },
  signalArt: { width: 164, height: 164, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: spacing.xl },
  signalRing: { position: 'absolute', borderWidth: 1, borderRadius: 100, opacity: 0.28 },
  ringOuter: { width: 164, height: 164 },
  ringMiddle: { width: 122, height: 122, opacity: 0.42 },
  ringInner: { width: 82, height: 82, opacity: 0.68 },
  signalCore: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 42, lineHeight: 45, fontWeight: '700', letterSpacing: -0.8, textAlign: 'center' },
  heroBody: { fontSize: typeScale.body.size, lineHeight: 25, textAlign: 'center', maxWidth: 380, alignSelf: 'center', marginTop: spacing.md },
  promiseRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.lg, marginTop: spacing.xl },
  promise: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  promiseText: { fontSize: typeScale.micro.size },
  actions: { gap: spacing.sm, marginTop: spacing.xxxl },
  legal: { fontSize: 11, lineHeight: 16, textAlign: 'center', maxWidth: 350, alignSelf: 'center', marginTop: spacing.lg },
  progressArea: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xxxl },
  progressTrack: { height: 4, flex: 1, borderRadius: 2, backgroundColor: 'rgba(128,145,170,0.22)', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  stepCount: { fontSize: typeScale.micro.size, minWidth: 28, textAlign: 'right' },
  formArea: { flexGrow: 1, justifyContent: 'center', paddingBottom: spacing.xl },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: spacing.md },
  formTitle: { fontSize: 32, lineHeight: 36, fontWeight: '700', letterSpacing: -0.4 },
  formBody: { fontSize: typeScale.body.size, lineHeight: 24, marginTop: spacing.md, marginBottom: spacing.xxl, maxWidth: 470 },
  fieldLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: spacing.sm },
  input: { borderRadius: radius.button, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: 15, fontSize: typeScale.body.size, minHeight: 54 },
  inputHint: { fontSize: typeScale.micro.size, lineHeight: 16, marginTop: spacing.sm, marginBottom: spacing.sm },
  privateNote: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md },
  codeInput: { letterSpacing: 8, fontSize: 23, fontWeight: '600' },
  resend: { fontSize: typeScale.caption.size, fontWeight: '600', marginTop: spacing.lg },
  error: { fontSize: typeScale.caption.size, lineHeight: 20, marginVertical: spacing.md },
  switchMode: { alignItems: 'center', paddingVertical: spacing.lg },
  switchText: { fontSize: typeScale.caption.size },
});
