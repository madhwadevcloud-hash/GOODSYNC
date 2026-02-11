import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

export type Role = 'student' | 'teacher' | 'admin' | 'superadmin';

export async function loginSchool(params: { identifier: string; password: string; schoolCode: string }): Promise<{ success: boolean; message?: string }> {
  try {
    console.log('[AUTH SERVICE] Attempting school login...');
    const { data } = await api.post('/auth/school-login', {
      identifier: params.identifier,
      password: params.password,
      schoolCode: params.schoolCode,
    });

    console.log('[AUTH SERVICE] Login response:', { success: data?.success, hasToken: !!data?.token, hasUser: !!data?.user });

    if (!data?.success || !data?.token || !data?.user) {
      return { success: false, message: data?.message || 'Login failed' };
    }

    // Store auth data
    await AsyncStorage.multiSet([
      ['authToken', data.token],
      ['userData', JSON.stringify(data.user)],
      ['schoolCode', params.schoolCode],
      ['role', (data.user.role || '').toString().toLowerCase()],
    ]);

    // Verify storage
    const storedToken = await AsyncStorage.getItem('authToken');
    const storedSchoolCode = await AsyncStorage.getItem('schoolCode');
    console.log('[AUTH SERVICE] Token stored successfully:', !!storedToken);
    console.log('[AUTH SERVICE] School code stored:', storedSchoolCode);
    console.log('[AUTH SERVICE] User role:', data.user.role);

    return { success: true };
  } catch (error: any) {
    console.error('[AUTH SERVICE] Login error:', error);
    const message = error?.response?.data?.message || 'Login failed';
    return { success: false, message };
  }
}

export async function loginGlobal(params: { email: string; password: string }): Promise<{ success: boolean; message?: string }> {
  try {
    const { data } = await api.post('/auth/login', {
      email: params.email,
      password: params.password,
    });

    if (!data?.success || !data?.token || !data?.user) {
      return { success: false, message: data?.message || 'Login failed' };
    }

    await AsyncStorage.multiSet([
      ['authToken', data.token],
      ['userData', JSON.stringify(data.user)],
      ['role', (data.user.role || '').toString().toLowerCase()],
    ]);
    return { success: true };
  } catch (error: any) {
    const message = error?.response?.data?.message || 'Login failed';
    return { success: false, message };
  }
}

export async function logout(): Promise<void> {
  await AsyncStorage.multiRemove(['authToken', 'userData', 'schoolCode', 'role']);
}

export async function getCurrentUser(): Promise<{ token: string | null; role: Role | null; schoolCode: string | null }> {
  const [token, role, schoolCode] = await AsyncStorage.multiGet(['authToken', 'role', 'schoolCode']).then((entries: readonly [string, string | null][]) => entries.map((e: readonly [string, string | null]) => e[1]));
  return { token, role: (role as Role) || null, schoolCode };
}


