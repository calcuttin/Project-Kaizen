import { expect, test } from '@playwright/test';

// Test-only Clerk transport replacement. The actual App, WorkspaceGate, stores,
// persistence, auth bridge, and sync engine run unchanged in cloud mode.
const clerkFixture = `
import React from '/node_modules/.vite/deps/react.js';
const {useEffect,useState}=React;
const user = () => localStorage.getItem('test-owner') || 'user_a';
function useOwner() {
  const [owner,setOwner]=useState(user);
  useEffect(()=>{const update=()=>setOwner(user());window.addEventListener('test-auth',update);return()=>window.removeEventListener('test-auth',update);},[]);
  return owner;
}
const change = (id) => {localStorage.setItem('test-owner',id);window.dispatchEvent(new Event('test-auth'));};
export const ClerkProvider = ({children}) => React.createElement(React.Fragment,null,
  React.createElement('button',{onClick:()=>change('user_a')},'Test account A'),
  React.createElement('button',{onClick:()=>change('user_b')},'Test account B'),
  React.createElement('button',{onClick:()=>change('signed_out')},'Test sign out'),children);
export function useAuth(){const owner=useOwner();return {isLoaded:true,isSignedIn:owner!=='signed_out',signOut:async()=>change('signed_out')};}
export function useUser(){const owner=useOwner();return {user:owner==='signed_out'?null:{id:owner,primaryEmailAddress:{emailAddress:owner+'@example.test'},fullName:owner}};}
export function useSession(){const owner=useOwner();return {session:owner==='signed_out'?null:{id:'session_'+owner,user:{id:owner},getToken:async()=>owner}};}
export const UserButton=()=>null;
export const SignInButton=({children})=>children;
export const SignUpButton=({children})=>children;
`;

test('cloud accounts have separate data and survive reload and sign-out', async ({ page }) => {
  const pushes: { owner: string; body: string }[] = [];
  await page.route('**/node_modules/.vite/deps/@clerk_react.js*', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: clerkFixture.replace('/node_modules/.vite/deps/react.js', `/node_modules/.vite/deps/react.js${new URL(route.request().url()).search}`),
  }));
  await page.route('https://account-isolation.invalid/**', (route) => {
    const request = route.request();
    if (request.url().endsWith('/push_changes')) {
      pushes.push({ owner: request.headers().authorization ?? '', body: request.postData() ?? '' });
      const body = request.postDataJSON() as { p_mutations: { mutationId: string }[] };
      return route.fulfill({ json: body.p_mutations.map((item) => ({ mutation_id: item.mutationId, status: 'accepted', revision: 1 })) });
    }
    return route.fulfill({ json: [] });
  });
  await page.goto('/library');
  await expect(page.getByRole('heading', { name: 'Bookshelf' })).toBeVisible();
  await page.getByRole('button', { name: 'Import', exact: true }).click();
  await page.locator('input[type=file]').setInputFiles({ name: 'a-books.csv', mimeType: 'text/csv', buffer: Buffer.from('Title,Author\nAccount A Private Book,Author A') });
  await page.getByRole('button', { name: 'Import 1', exact: true }).click();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Account A Private Book' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Account A Private Book' })).toBeVisible();

  await page.getByRole('button', { name: 'Test account B' }).click();
  await expect(page.getByRole('heading', { name: 'Bookshelf' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Account A Private Book' })).toHaveCount(0);
  await page.goto('/settings');
  await expect(page.getByText('user_b@example.test')).toBeVisible();
  await page.getByRole('button', { name: 'Save now', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Save now', exact: true })).toBeEnabled();
  expect(pushes.some((request) => request.owner === 'Bearer user_b' && request.body.includes('Account A Private Book'))).toBe(false);
  await expect(page.getByText('a-books.csv', { exact: false })).toHaveCount(0);

  await page.getByRole('button', { name: 'Test sign out' }).click();
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
  await expect(page.getByText('user_b@example.test')).toHaveCount(0);
  await page.getByRole('button', { name: 'Test account A' }).click();
  await page.goto('/library');
  await expect(page.getByRole('button', { name: 'Account A Private Book' })).toBeVisible();
});
