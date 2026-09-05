package kr.teumpick.app;
import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
@CapacitorPlugin(name="SessionVault")
public class SessionVaultPlugin extends Plugin {
 private static final String ALIAS="teumpick_session_v1";
 private SharedPreferences prefs(){return getContext().getSharedPreferences("teumpick_secure",Context.MODE_PRIVATE);}
 private SecretKey key() throws Exception {KeyStore ks=KeyStore.getInstance("AndroidKeyStore");ks.load(null);if(!ks.containsAlias(ALIAS)){KeyGenerator g=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");g.init(new KeyGenParameterSpec.Builder(ALIAS,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());g.generateKey();}return (SecretKey)ks.getKey(ALIAS,null);}
 @PluginMethod public void set(PluginCall call){String value=call.getString("value");if(value==null||!value.matches("[a-f0-9]{64}")){call.reject("Invalid session");return;}try{Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.ENCRYPT_MODE,key());String iv=Base64.encodeToString(c.getIV(),Base64.NO_WRAP);String data=Base64.encodeToString(c.doFinal(value.getBytes(StandardCharsets.UTF_8)),Base64.NO_WRAP);if(!prefs().edit().putString("iv",iv).putString("data",data).commit())throw new Exception("Storage failed");call.resolve();}catch(Exception e){call.reject("Secure storage unavailable");}}
 @PluginMethod public void get(PluginCall call){try{String data=prefs().getString("data",null),iv=prefs().getString("iv",null);JSObject out=new JSObject();if(data!=null&&iv!=null){Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.DECRYPT_MODE,key(),new GCMParameterSpec(128,Base64.decode(iv,Base64.NO_WRAP)));out.put("value",new String(c.doFinal(Base64.decode(data,Base64.NO_WRAP)),StandardCharsets.UTF_8));}call.resolve(out);}catch(Exception e){prefs().edit().clear().apply();call.resolve(new JSObject());}}
 @PluginMethod public void clear(PluginCall call){if(prefs().edit().clear().commit())call.resolve();else call.reject("Unable to clear session");}
}
