import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthContextValue } from './AuthProvider';
const fixture=vi.hoisted(()=>({value:undefined as AuthContextValue|undefined,metadata:{} as Record<string,unknown>,update:vi.fn(),signedIn:true,sessionUser:'user_a',token:vi.fn(),bridge:vi.fn()}));
vi.mock('@clerk/react',()=>({
 useAuth:()=>({isLoaded:true,isSignedIn:fixture.signedIn,signOut:vi.fn()}),
 useSession:()=>({session:{id:'session_a',user:{id:fixture.sessionUser},getToken:fixture.token}}),
 useUser:()=>({user:{id:'user_a',fullName:'Test reader',primaryEmailAddress:{emailAddress:'reader@example.test'},unsafeMetadata:fixture.metadata,update:fixture.update}}),
}));
vi.mock('@/core/config',()=>({config:{defaultExperience:'full',appUrl:'https://example.test'},cloudConfigurationError:()=>null}));
vi.mock('@/core/device',()=>({getDeviceId:()=> 'test-device'}));
vi.mock('@/core/supabase',()=>({setSupabaseAccessTokenProvider:fixture.bridge}));
vi.mock('./AuthProvider',()=>({AuthContextProvider:({value}:{value:AuthContextValue})=>{fixture.value=value;return null;}}));
import { ClerkAuthProvider } from './ClerkAuthProvider';
beforeEach(()=>{fixture.metadata={};fixture.signedIn=true;fixture.sessionUser='user_a';fixture.update.mockReset();fixture.bridge.mockReset();});
const render=()=>renderToString(<ClerkAuthProvider><span>App</span></ClerkAuthProvider>);
describe('shared Clerk account experience',()=>{
 it('keeps an existing account on full Kaizen and respects a saved Bookshelf preference',()=>{render();expect(fixture.value?.experience).toBe('full');fixture.metadata={kaizenExperience:'bookshelf'};render();expect(fixture.value?.experience).toBe('bookshelf');expect(fixture.value?.user?.id).toBe('user_a');});
 it('changes only the preference on the same Clerk user and preserves other metadata',async()=>{fixture.metadata={otherPreference:'keep'};render();await fixture.value!.setExperience('bookshelf');expect(fixture.update).toHaveBeenCalledWith({unsafeMetadata:{otherPreference:'keep',kaizenExperience:'bookshelf'}});});
 it('does not claim the new preference when the server rejects the update',async()=>{fixture.update.mockRejectedValueOnce(new Error('offline'));render();await expect(fixture.value!.setExperience('bookshelf')).rejects.toThrow('offline');expect(fixture.value?.experience).toBe('full');});
 it('blocks preference changes and Supabase tokens when session ownership does not match',async()=>{fixture.sessionUser='user_b';render();expect(fixture.value?.user).toBeNull();expect(fixture.bridge).toHaveBeenLastCalledWith(undefined,undefined);await expect(fixture.value!.setExperience('bookshelf')).rejects.toThrow('Sign in');expect(fixture.update).not.toHaveBeenCalled();});
});
