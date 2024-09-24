import { ref } from 'vue';


export default function useAuthentication() {
  /** Authenticated username */
  const username = ref<string | undefined>(undefined);
  /** Keycloak user email */
  const email = ref<string>();
  /** Keycloak token */
  const token = ref<string | undefined>(undefined);

  username.value = 'username';
  email.value = 'admin@admin.com';
  token.value = 'access-token';


  // User login
  const login = (
    type = 'login-required'
  ): Promise<void> =>
    new Promise((resolve: any, reject) => {
      try {
        resolve()
      } catch (e) {
        reject(e);
      }
    });

  // User logout
  const logout = () => {}

  return {
    username,
    token,
    email,
    login,
    logout,
  };
}
