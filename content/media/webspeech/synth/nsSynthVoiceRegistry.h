/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#pragma once

#include "nsAutoPtr.h"
#include "nsISynthVoiceRegistry.h"
#include "nsRefPtrHashtable.h"
#include "nsTArray.h"

class nsISpeechService;

namespace mozilla {
namespace dom {

class RemoteVoice;
class SpeechSynthesisUtterance;
class SpeechSynthesisChild;
class nsSpeechTask;
class VoiceData;

class nsSynthVoiceRegistry : public nsISynthVoiceRegistry
{
public:
  NS_DECL_ISUPPORTS
  NS_DECL_NSISYNTHVOICEREGISTRY

  nsSynthVoiceRegistry();
  virtual ~nsSynthVoiceRegistry();

  already_AddRefed<nsSpeechTask> SpeakUtterance(SpeechSynthesisUtterance& aUtterance,
                                                const nsAString& aDocLang);

  void Speak(const nsAString& aText, const nsAString& aLang,
             const nsAString& aUri, const float& aRate, const float& aPitch,
             nsSpeechTask* aTask);

  void SendVoices(InfallibleTArray<RemoteVoice>* aVoices,
                  InfallibleTArray<nsString>* aDefaults);

  static nsSynthVoiceRegistry* GetInstance();

  static already_AddRefed<nsSynthVoiceRegistry> GetInstanceForService();

  static void RecvRemoveVoice(const nsAString& aUri);

  static void RecvAddVoice(const RemoteVoice& aVoice);

  static void RecvSetDefaultVoice(const nsAString& aUri, bool aIsDefault);

  static void Shutdown();

private:
  VoiceData* FindBestMatch(const nsAString& aUri, const nsAString& lang);

  bool FindVoiceByLang(const nsAString& aLang, VoiceData** aRetval);

  nsresult AddVoiceImpl(nsISpeechService* aService,
                        const nsAString& aUri,
                        const nsAString& aName,
                        const nsAString& aLang,
                        bool aLocalService);

  nsTArray<nsRefPtr<VoiceData> > mVoices;

  nsTArray<nsRefPtr<VoiceData> > mDefaultVoices;

  nsRefPtrHashtable<nsStringHashKey, VoiceData> mUriVoiceMap;

  SpeechSynthesisChild* mSpeechSynthChild;
};

} // namespace dom
} // namespace mozilla
