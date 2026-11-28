import { NetworkFeatureIndex } from '@/features/network/network-feature-index'
import { AccountFeatureIndex } from '@/features/account/account-feature-index'
import { AppConfig } from '@/constants/app-config'
import { Button, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Link } from 'expo-router'
import React from 'react'
import { appStyles } from '@/constants/app-styles'

export default function DevScreen() {
  return (
    <SafeAreaView style={appStyles.screen}>
      <View style={appStyles.stack}>
        <Text style={appStyles.title}>App Config</Text>
        <View style={appStyles.card}>
          <Text>
            Name <Text style={{ fontWeight: 'bold' }}>{AppConfig.name}</Text>
          </Text>
          <Text>
            URL <Text style={{ fontWeight: 'bold' }}>{AppConfig.uri}</Text>
          </Text>
        </View>
        <Link href="/wallet" asChild>
          <Button title="Wallet screen" />
        </Link>
        <AccountFeatureIndex />
        <NetworkFeatureIndex />
      </View>
    </SafeAreaView>
  )
}
