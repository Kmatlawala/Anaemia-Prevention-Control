@echo off
echo Creating production keystore for Animia...

keytool -genkeypair -v -storetype PKCS12 -keystore animia-release-key.keystore -alias animia-key-alias -keyalg RSA -keysize 2048 -validity 10000 -storepass animia123 -keypass animia123 -dname "CN=Animia Health, OU=Development, O=Animia, L=Ahmedabad, S=Gujarat, C=IN"

echo.
echo Keystore created successfully!
echo Keystore file: animia-release-key.keystore
echo Alias: animia-key-alias
echo Store password: animia123
echo Key password: animia123
echo.
echo IMPORTANT: Keep these credentials safe and secure!
echo.
pause







