import { Button, Text, View } from 'react-native'
import { ellipsify } from '@/utils/ellipsify'
import React from 'react'
import { useShareIntentContext } from 'expo-share-intent'
import { AccountFeatureGetBalance } from '@/features/account/account-feature-get-balance'
import { useMobileWallet } from '@wallet-ui/react-native-web3js'
import { appStyles } from '@/constants/app-styles'
import { AccountFeatureSignMessage } from '@/features/account/account-feature-sign-message'
import { AccountFeatureRegisterRecording } from '@/features/account/account-feature-register-recording'
import { AccountFeatureSealShared } from '@/features/account/account-feature-seal-shared'
import { AccountFeatureSignIn } from '@/features/account/account-feature-sign-in'
import { AccountFeatureDisconnect } from '@/features/account/account-feature-disconnect'
import { AccountFeatureConnect } from '@/features/account/account-feature-connect'

export function AccountFeatureIndex() {
  const { account } = useMobileWallet()
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext()
  const sharedFile = hasShareIntent ? shareIntent.files?.[0] : undefined

  return (
    <View style={appStyles.stack}>
      {/* Katman 1: başka bir uygulamadan paylaşılan dosya geldiyse en üstte mühürleme. */}
      {sharedFile ? (
        <View style={appStyles.stack}>
          <Text style={appStyles.title}>Paylaşılan dosyayı mühürle</Text>
          {account ? (
            <AccountFeatureSealShared address={account.address} file={sharedFile} />
          ) : (
            <View style={appStyles.stack}>
              <Text>Mühürlemek için önce cüzdanı bağla.</Text>
              <AccountFeatureConnect />
            </View>
          )}
          <Button title="Vazgeç" onPress={() => resetShareIntent()} />
        </View>
      ) : null}

      <Text style={appStyles.title}>Account</Text>
      {account ? (
        <View style={appStyles.stack}>
          <View style={appStyles.card}>
            <Text>Connected to {ellipsify(account.address.toString(), 8)}</Text>
            <AccountFeatureGetBalance address={account.address} />
          </View>
          <AccountFeatureSignIn address={account.address} />
          <AccountFeatureSignMessage address={account.address} />
          <AccountFeatureRegisterRecording address={account.address} />
          <AccountFeatureDisconnect />
        </View>
      ) : (
        <AccountFeatureConnect />
      )}
    </View>
  )
}
