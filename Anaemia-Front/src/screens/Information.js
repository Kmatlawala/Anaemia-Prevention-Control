import React, {useMemo, useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Dimensions,
  Animated,
} from 'react-native';
import Header from '../components/Header';
import {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
  platform,
} from '../theme/theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {getRole} from '../utils/role';
import LinearGradient from 'react-native-linear-gradient';

const {width: screenWidth} = Dimensions.get('window');

const CONTENT = {
  pregnant: {
    en: {
      title: 'Pregnant Women',
      subtitle: 'IFA • ANC • Nutrition',
      video: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      sections: [
        {
          title: 'IFA and Calcium Supplementation',
          points: [
            'Take 1 IFA tablet daily',
            'Keep 2-hour gap between IFA and calcium',
            'Do not take double dose if missed',
          ],
        },
        {
          title: 'Dietary Advice',
          points: [
            'Take iron and protein-rich foods',
            'Include vitamin C-rich foods',
            'Avoid tea/coffee near meal times',
          ],
        },
        {
          title: 'Side Effect Management',
          points: [
            'Mild constipation/dark stools are normal',
            'Take IFA after meals if nausea occurs',
            'Report to health worker if severe side effects occur',
          ],
        },
        {
          title: 'Deworming Medicine',
          points: [
            'Take albendazole once during pregnancy (2nd trimester) as advised',
            'Maintain hygiene',
          ],
        },
        {
          title: 'ANC and Danger Signs',
          points: [
            'Attend all ANC check-ups',
            'Take adequate rest and balanced diet',
            'Report danger signs: breathing difficulty, palpitations, dizziness, bleeding',
          ],
        },
        {
          title: 'Follow-up',
          points: [
            'Get regular Hb testing done at intervals',
            'Keep ID/application code for records',
          ],
        },
      ],
    },
    gu: {
      title: 'ગર્ભવતી સ્ત્રીઓ',
      subtitle: 'IFA • ANC • પોષણ',
      video: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      sections: [
        {
          title: 'આઇએફએ અને કેલ્શિયમ સપ્લિમેન્ટેશન',
          points: [
            'દરરોજ 1 આઇએફએ ટેબ્લેટ લો',
            'આઇએફએ અને કેલ્શિયમ વચ્ચે 2 કલાકનો અંતર રાખો',
            'જો ચૂકી જાઓ તો ડબલ-ડોઝ ન લો',
          ],
        },
        {
          title: 'આહારની સલાહ',
          points: [
            'આયર્ન અને પ્રોટીનથી ભરપૂર ખોરાક લો',
            'વિટામિન સીથી ભરપૂર ખોરાકનો સમાવેશ કરો',
            'ભોજનની નજીકના સમયે ચા/કોફી ટાળો',
          ],
        },
        {
          title: 'આડઅસરનું સંચાલન',
          points: [
            'હળવો કબજિયાત/કાળા ઝાડા સામાન્ય છે',
            'જો ઉબકા આવે તો ભોજન પછી IFA લો',
            'ગંભીર આડઅસર હોય તો આરોગ્ય કાર્યકરને જાણ કરો',
          ],
        },
        {
          title: 'કૃમિનાશક દવા',
          points: [
            'ગર્ભાવસ્થા દરમિયાન એકવાર (બીજા ત્રિમાસિકમાં) સલાહ મુજબ આલ્બેન્ડાઝોલ લો',
            'સ્વચ્છતા જાળવો',
          ],
        },
        {
          title: 'ANC (એએનસી) અને જોખમી ચિહ્નો',
          points: [
            'તમામ ANC ચેક-અપ્સ માટે હાજર રહો',
            'પૂરતો આરામ અને સંતુલિત આહાર લો',
            'જોખમી ચિહ્નોની જાણ કરો: શ્વાસ લેવામાં તકલીફ, ધબકારા, ચક્કર આવવા, રક્તસ્રાવ',
          ],
        },
        {
          title: 'ફોલો-અપ',
          points: [
            'નિયમિત અંતરાલે Hb ટેસ્ટિંગ કરાવો',
            'રેકોર્ડ માટે આઈડી/એપ્લિકેશન કોડ સાથે રાખો',
          ],
        },
      ],
    },
    hi: {
      title: 'गर्भवती महिलाएँ',
      subtitle: 'IFA • ANC • पोषण',
      video: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      sections: [
        {
          title: 'आईएफए और कैल्शियम सप्लीमेंटेशन',
          points: [
            'रोज़ाना 1 आईएफए टैबलेट लें',
            'आईएफए और कैल्शियम के बीच 2 घंटे का अंतर रखें',
            'भूल जाएँ तो डबल-डोज़ न लें',
          ],
        },
        {
          title: 'आहार की सलाह',
          points: [
            'आयरन और प्रोटीन से भरपूर भोजन लें',
            'विटामिन सी से भरपूर भोजन शामिल करें',
            'भोजन के नज़दीकी समय में चाय/कॉफी से बचें',
          ],
        },
        {
          title: 'साइड इफेक्ट का संचालन',
          points: [
            'हल्का कब्ज/काले मल सामान्य है',
            'उल्टी आए तो भोजन के बाद आईएफए लें',
            'गंभीर साइड इफेक्ट हो तो स्वास्थ्य कर्मी को जानकारी दें',
          ],
        },
        {
          title: 'कृमिनाशक दवा',
          points: [
            'गर्भावस्था के दौरान एक बार (दूसरी तिमाही में) सलाह अनुसार अल्बेंडाज़ोल लें',
            'स्वच्छता बनाए रखें',
          ],
        },
        {
          title: 'एएनसी (ANC) और खतरे के संकेत',
          points: [
            'सभी ANC चेक-अप्स के लिए उपस्थित रहें',
            'पर्याप्त आराम और संतुलित आहार लें',
            'खतरे के संकेतों की जानकारी दें: साँस लेने में तकलीफ, धड़कन, चक्कर, रक्तस्राव',
          ],
        },
        {
          title: 'फॉलो-अप',
          points: [
            'नियमित अंतराल पर Hb टेस्टिंग कराएँ',
            'रिकॉर्ड के लिए ID/एप्लिकेशन कोड रखें',
          ],
        },
      ],
    },
  },
  under5: {
    en: {
      title: 'Under-5 Children',
      subtitle: 'Breastfeeding • Complementary feeding',
      video: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      sections: [
        {
          title: 'IFA Supplementation',
          points: [
            'Start IFA syrup/tablets as per schedule from 6 months',
            'Follow recommended dosage',
          ],
        },
        {
          title: 'Dietary Advice',
          points: [
            'Give iron-rich complementary foods (dal, ragi, green leafy vegetables, eggs)',
            'Give vitamin C-rich foods (oranges, lemons, sour fruits) with meals',
          ],
        },
        {
          title: 'Deworming Medicine',
          points: [
            'Give albendazole (Albendazole) every 6 months after 1 year of age',
            'Pay attention to hygiene and hand washing',
          ],
        },
        {
          title: 'Development & Health Monitoring',
          points: [
            'Get regular weight/height monitoring done',
            'Pay attention to signs of weakness, poor appetite, and frequent infections',
          ],
        },
      ],
    },
    gu: {
      title: '૫ વર્ષથી ઓછા બાળકો',
      subtitle: 'સ્તનપાન • પુરક આહાર',
      video: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      sections: [
        {
          title: 'આઇએફએ સપ્લિમેન્ટેશન',
          points: [
            'શેડ્યૂલ મુજબ 6 મહિનાથી આઇએફએ સીરપ/ગોળીઓ શરૂ કરો',
            'શિફારસ કરેલ ડોઝ અનુસરો',
          ],
        },
        {
          title: 'આહારની સલાહ',
          points: [
            'આયર્નથી ભરપૂર પૂરક ખોરાક (દાળ, રાગી, લીલા પાંદડાવાળા શાકભાજી, ઈંડા) આપો',
            'ભોજન સાથે વિટામિન સીથી ભરપૂર ખોરાક (આમળાં, લીંબુ, ખાટાં ફળો) આપો',
          ],
        },
        {
          title: 'કૃમિનાશક દવા',
          points: [
            '૧ વર્ષની ઉંમર પછી દર ૬ મહિને આલ્બેન્ડાઝોલ (Albendazole) આપો',
            'સ્વચ્છતા અને હાથ ધોવાનું ધ્યાન રાખો',
          ],
        },
        {
          title: 'વિકાસ અને સ્વાસ્થ્યનું નિરીક્ષણ',
          points: [
            'નિયમિત વજન/ઊંચાઈનું નિરીક્ષણ કરાવો',
            'ફીકાશ, ઓછી ભૂખ, અને વારંવાર ચેપના લક્ષણો પર ધ્યાન રાખો',
          ],
        },
      ],
    },
    hi: {
      title: '५ वर्ष से कम बच्चे',
      subtitle: 'स्तनपान • पूरक आहार',
      video: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      sections: [
        {
          title: 'आईएफए सप्लीमेंटेशन',
          points: [
            'शेड्यूल के अनुसार 6 महीने से आईएफए सिरप/गोलियाँ शुरू करें',
            'सुझाई गई खुराक का पालन करें',
          ],
        },
        {
          title: 'आहार की सलाह',
          points: [
            'आयरन से भरपूर पूरक आहार (दाल, रागी, हरी पत्तेदार सब्जियाँ, अंडे) दें',
            'भोजन के साथ विटामिन सी से भरपूर भोजन (संतरे, नींबू, खट्टे फल) दें',
          ],
        },
        {
          title: 'कृमिनाशक दवा',
          points: [
            '१ साल की उम्र के बाद हर ६ महीने में अल्बेंडाज़ोल (Albendazole) दें',
            'स्वच्छता और हाथ धोने का ध्यान रखें',
          ],
        },
        {
          title: 'विकास और स्वास्थ्य का निरीक्षण',
          points: [
            'नियमित वजन/ऊँचाई का निरीक्षण कराएँ',
            'कमज़ोरी, कम भूख, और बार-बार संक्रमण के लक्षणों पर ध्यान रखें',
          ],
        },
      ],
    },
  },
  adolescent: {
    en: {
      title: 'Adolescent Girls',
      subtitle: 'Weekly IFA • Healthy diet',
      video: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      sections: [
        {
          title: 'IFA Supplementation',
          points: [
            'Take 1 IFA tablet weekly (as per WIFS program)',
            'Do not take double dose if missed',
          ],
        },
        {
          title: 'Dietary Advice',
          points: [
            'Eat iron-rich foods (green leafy vegetables, jaggery, peanuts, pulses, ragi, dates, meat, eggs)',
            'Take vitamin C-rich foods with meals',
            'Avoid tea/coffee near meal times',
          ],
        },
        {
          title: 'Deworming Medicine',
          points: ['Take albendazole every 6 months', 'Maintain hand hygiene'],
        },
        {
          title: 'Menstrual Health',
          points: [
            'Maintain hygiene during menstruation',
            'Report if there is excessive bleeding or irregular menstrual cycle',
          ],
        },
        {
          title: 'Follow-up',
          points: [
            'Get regular Hb testing done in school/community',
            'Report IFA side effects immediately if any occur',
          ],
        },
      ],
    },
    gu: {
      title: 'કિશોરીઓ',
      subtitle: 'સપ્તાહિક IFA • હેલ્ધી ડાયેટ',
      video: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      sections: [
        {
          title: 'આઇએફએ સપ્લિમેન્ટેશન',
          points: [
            'અઠવાડિયામાં 1 આઇએફએ ટેબ્લેટ લો (WIFS કાર્યક્રમ મુજબ)',
            'જો ચૂકી જાઓ તો ડબલ-ડોઝ ન લો',
          ],
        },
        {
          title: 'આહારની સલાહ',
          points: [
            'આયર્નથી ભરપૂર ખોરાક (લીલા પાંદડાવાળા શાકભાજી, ગોળ, મગફળી, કઠોળ, રાગી, ખજૂર, માંસ, ઈંડા) ખાઓ',
            'ભોજન સાથે વિટામિન સીથી ભરપૂર ખોરાક લો',
            'ભોજનની નજીકના સમયે ચા/કોફી ટાળો',
          ],
        },
        {
          title: 'કૃમિનાશક દવા',
          points: ['દર ૬ મહિને આલ્બેન્ડાઝોલ લો', 'હાથની સ્વચ્છતા જાળવો'],
        },
        {
          title: 'માસિક સ્વાસ્થ્ય',
          points: [
            'માસિક ધર્મ દરમિયાન સ્વચ્છતા જાળવો',
            'જો વધુ રક્તસ્રાવ અથવા અનિયમિત માસિક ચક્ર હોય તો જાણ કરો',
          ],
        },
        {
          title: 'ફોલો-અપ',
          points: [
            'શાળા/સમુદાયમાં નિયમિત Hb ટેસ્ટિંગ કરાવો',
            'IFAની આડઅસરો હોય તો તરત જ જાણ કરો',
          ],
        },
      ],
    },
    hi: {
      title: 'किशोरियाँ',
      subtitle: 'साप्ताहिक IFA • हेल्दी डाइट',
      video: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      sections: [
        {
          title: 'आईएफए सप्लीमेंटेशन',
          points: [
            'सप्ताह में 1 आईएफए टैबलेट लें (WIFS कार्यक्रम के अनुसार)',
            'भूल जाएँ तो डबल-डोज़ न लें',
          ],
        },
        {
          title: 'आहार की सलाह',
          points: [
            'आयरन से भरपूर भोजन (हरी पत्तेदार सब्जियाँ, गुड़, मूँगफली, दालें, रागी, खजूर, मांस, अंडे) खाएँ',
            'भोजन के साथ विटामिन सी से भरपूर भोजन लें',
            'भोजन के नज़दीकी समय में चाय/कॉफी से बचें',
          ],
        },
        {
          title: 'कृमिनाशक दवा',
          points: [
            'हर ६ महीने में अल्बेंडाज़ोल लें',
            'हाथ की स्वच्छता बनाए रखें',
          ],
        },
        {
          title: 'मासिक स्वास्थ्य',
          points: [
            'मासिक धर्म के दौरान स्वच्छता बनाए रखें',
            'यदि अधिक रक्तस्राव या अनियमित मासिक चक्र हो तो जानकारी दें',
          ],
        },
        {
          title: 'फॉलो-अप',
          points: [
            'स्कूल/समुदाय में नियमित Hb टेस्टिंग कराएँ',
            'आईएफए की साइड इफेक्ट्स हों तो तुरंत जानकारी दें',
          ],
        },
      ],
    },
  },
};

const LANGS = [
  {code: 'en', label: 'EN'},
  {code: 'gu', label: 'GU'},
  {code: 'hi', label: 'HI'},
];

const Information = ({navigation}) => {
  const [lang, setLang] = useState('gu');
  const [category, setCategory] = useState('');
  const [isPatient, setIsPatient] = useState(false);
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    (async () => {
      const r = await getRole();
      setIsPatient(String(r || '').toLowerCase() === 'patient');
    })();
  }, []);

  useEffect(() => {
    if (isPatient) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isPatient]);

  const catOptions = useMemo(
    () => [
      {label: CONTENT.pregnant[lang].title, value: 'pregnant'},
      {label: CONTENT.under5[lang].title, value: 'under5'},
      {label: CONTENT.adolescent[lang].title, value: 'adolescent'},
    ],
    [lang],
  );

  const section = category ? CONTENT[category][lang] : null;

  const getCategoryColor = () => {
    switch (category) {
      case 'pregnant':
        return colors.pregnant;
      case 'under5':
        return colors.under5;
      case 'adolescent':
        return colors.adolescent;
      default:
        return colors.primary;
    }
  };

  const keyInfoData = useMemo(() => {
    if (!section || !section.sections || !Array.isArray(section.sections))
      return [];
    return section.sections.slice(0, 3).map((sectionItem, index) => ({
      title: sectionItem?.title || 'Information',
      subtitle: section?.subtitle || '',
      points: sectionItem?.points || [],
      video: section?.video || null,
      id: index,
    }));
  }, [section]);

  return (
    <View style={styles.screen}>
      <Header
        title="Information"
        variant="back"
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={{paddingBottom: spacing.lg}}
        showsVerticalScrollIndicator={false}>
        {}
        {isPatient && (
          <Animated.View
            style={[
              styles.patientBanner,
              {
                transform: [{scale: pulseAnim}],
              },
            ]}>
            <LinearGradient
              colors={[
                colors.primary,
                colors.primary + 'DD',
                colors.primary + 'BB',
              ]}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 0}}
              style={styles.patientBannerGradient}>
              <View style={styles.patientBannerContent}>
                <View style={styles.patientBannerIconContainer}>
                  <Icon name="information" size={32} color={colors.white} />
                </View>
                <View style={styles.patientBannerTextContainer}>
                  <Text style={styles.patientBannerTitle}>
                    Important Health Information
                  </Text>
                  <Text style={styles.patientBannerSubtitle}>
                    Learn about IFA, nutrition, and follow-up care for your
                    health
                  </Text>
                </View>
                <View style={styles.patientBannerArrow}>
                  <Icon name="arrow-down" size={24} color={colors.white} />
                </View>
              </View>
            </LinearGradient>
          </Animated.View>
        )}

        {}
        <View style={[styles.topRow, isPatient && styles.topRowPatient]}>
          <View style={styles.titleContainer}>
            <View style={styles.titleIconContainer}>
              <Icon name="book-open-variant" size={15} color={colors.white} />
            </View>
            <Text style={styles.pageTitle}>Learn & Stay Healthy</Text>
          </View>
          <View style={styles.langContainer}>
            {LANGS.map(l => (
              <TouchableOpacity
                key={l.code}
                style={[
                  styles.langBtn,
                  lang === l.code && styles.langBtnActive,
                ]}
                onPress={() => setLang(l.code)}>
                <Text
                  style={
                    lang === l.code
                      ? styles.langBtnTextActive
                      : styles.langBtnText
                  }>
                  {l.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {}
        <View style={styles.card}>
          <Text style={styles.label}>Select Category</Text>
          <View style={styles.categoryGrid}>
            {catOptions.map(option => {
              const isSelected = category === option.value;
              const categoryColor =
                option.value === 'pregnant'
                  ? colors.pregnant
                  : option.value === 'under5'
                  ? colors.under5
                  : option.value === 'adolescent'
                  ? colors.adolescent
                  : colors.primary;
              const categoryIcon =
                option.value === 'pregnant'
                  ? 'baby-face'
                  : option.value === 'under5'
                  ? 'baby-carriage'
                  : option.value === 'adolescent'
                  ? 'account-heart'
                  : 'account';

              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.categoryCard,
                    isSelected && styles.categoryCardSelected,
                    isPatient && styles.categoryCardPatient,
                    {borderColor: categoryColor},
                  ]}
                  onPress={() => setCategory(option.value)}>
                  <View
                    style={[
                      styles.categoryIconContainer,
                      {
                        backgroundColor: isSelected
                          ? categoryColor
                          : categoryColor + '20',
                      },
                    ]}>
                    <Icon
                      name={categoryIcon}
                      size={28}
                      color={isSelected ? colors.white : categoryColor}
                    />
                  </View>
                  <Text
                    style={[
                      styles.categoryTitle,
                      {color: isSelected ? categoryColor : colors.text},
                    ]}>
                    {option.label}
                  </Text>
                  {isSelected && (
                    <>
                      <View
                        style={[
                          styles.selectedIndicator,
                          {backgroundColor: categoryColor},
                        ]}
                      />
                      <View
                        style={[
                          styles.checkmarkContainer,
                          {backgroundColor: categoryColor},
                        ]}>
                        <Icon name="check" size={12} color={colors.white} />
                      </View>
                    </>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {category && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => setCategory('')}>
              <Icon
                name="close-circle"
                size={16}
                color={colors.textSecondary}
              />
              <Text style={styles.clearButtonText}>Clear Selection</Text>
            </TouchableOpacity>
          )}

          {!section ? (
            <View
              style={[
                styles.placeholder,
                isPatient && styles.placeholderPatient,
              ]}>
              <View
                style={[
                  styles.placeholderIcon,
                  isPatient && styles.placeholderIconPatient,
                ]}>
                <Icon
                  name="information-outline"
                  size={40}
                  color={isPatient ? colors.white : colors.primary}
                />
              </View>
              <Text
                style={[
                  styles.placeholderText,
                  isPatient && styles.placeholderTextPatient,
                ]}>
                {isPatient
                  ? '👆 Select your category above to see important health information, IFA guidelines, and follow-up care instructions.'
                  : 'Select a category to see detailed information and key messages.'}
              </Text>
              <View style={styles.placeholderDecorations}>
                <View
                  style={[
                    styles.decorationDot,
                    {backgroundColor: colors.primary + '30'},
                  ]}
                />
                <View
                  style={[
                    styles.decorationDot,
                    {backgroundColor: colors.secondary + '30'},
                  ]}
                />
                <View
                  style={[
                    styles.decorationDot,
                    {backgroundColor: colors.accent + '30'},
                  ]}
                />
              </View>
            </View>
          ) : (
            <>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.subtitle ? (
                <Text style={styles.subtitle}>{section.subtitle}</Text>
              ) : null}

              {}
              <View style={styles.detailedSection}>
                <Text style={styles.detailedTitle}>Detailed Information</Text>
                {section.sections.map((sectionItem, sectionIndex) => {
                  const categoryColor = getCategoryColor();
                  const sectionIcons = [
                    'pill',
                    'food-apple',
                    'medical-bag',
                    'shield-check',
                    'heart-pulse',
                    'clipboard-check',
                  ];
                  const currentIcon =
                    sectionIcons[sectionIndex % sectionIcons.length];

                  return (
                    <View
                      key={sectionIndex}
                      style={[
                        styles.sectionCard,
                        {borderLeftColor: categoryColor},
                      ]}>
                      <View style={styles.sectionHeader}>
                        <View
                          style={[
                            styles.sectionIconContainer,
                            {backgroundColor: categoryColor + '20'},
                          ]}>
                          <Icon
                            name={currentIcon}
                            size={24}
                            color={categoryColor}
                          />
                        </View>
                        <Text
                          style={[
                            styles.sectionItemTitle,
                            {color: categoryColor},
                          ]}>
                          {sectionItem.title}
                        </Text>
                      </View>
                      <View style={styles.sectionContent}>
                        {sectionItem.points.map((point, pointIndex) => (
                          <View key={pointIndex} style={styles.tipRow}>
                            <View
                              style={[
                                styles.tipIconContainer,
                                {backgroundColor: colors.success + '20'},
                              ]}>
                              <Icon
                                name="check-circle"
                                size={16}
                                color={colors.success}
                              />
                            </View>
                            <Text style={styles.tipText}>{point}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  );
                })}
              </View>

              {section.video ? (
                <TouchableOpacity
                  onPress={() => Linking.openURL(section.video)}
                  style={[
                    styles.videoBtn,
                    {backgroundColor: getCategoryColor()},
                  ]}>
                  <Icon name="play-circle" size={20} color="#fff" />
                  <Text style={styles.videoText}>Watch Video</Text>
                </TouchableOpacity>
              ) : null}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.background},

  topRow: {
    marginHorizontal: spacing.horizontal,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.horizontal,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  titleIconContainer: {
    backgroundColor: colors.primary,
    padding: spacing.xs,
    borderRadius: borderRadius.lg,
    ...shadows.md,
    borderWidth: 2,
    borderColor: colors.primaryDark,
  },
  pageTitle: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: typography.weights.bold,
    textShadowColor: colors.primary + '20',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 2,
  },
  langContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
  },

  langBtn: {
    borderWidth: 2,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.horizontal,
    borderRadius: borderRadius.md,
    minWidth: 40,
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  langBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    ...shadows.md,
  },
  langBtnText: {
    color: colors.text,
    ...typography.caption,
    fontWeight: typography.weights.medium,
  },
  langBtnTextActive: {
    color: colors.white,
    fontWeight: typography.weights.semibold,
  },

  card: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.horizontal,
    marginVertical: spacing.xs,
    paddingHorizontal: spacing.horizontal,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderTopWidth: 3,
    borderTopColor: colors.primary,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    fontWeight: typography.weights.medium,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  categoryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.horizontal,
    paddingVertical: spacing.md,
    width: '30%',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    ...shadows.sm,
    position: 'relative',
    minHeight: 120,
    justifyContent: 'center',
  },
  categoryCardSelected: {
    ...shadows.md,
    borderWidth: 3,
  },
  categoryCardPatient: {
    borderWidth: 2,
    borderStyle: 'solid',
    ...shadows.sm,
  },
  categoryIconContainer: {
    paddingHorizontal: spacing.horizontal,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  categoryTitle: {
    ...typography.small,
    textAlign: 'center',
    fontWeight: typography.weights.semibold,
    lineHeight: 16,
  },
  selectedIndicator: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 12,
    height: 12,
    borderRadius: 6,
    ...shadows.sm,
  },
  checkmarkContainer: {
    position: 'absolute',
    bottom: spacing.xs,
    right: spacing.xs,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.horizontal,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.sm,
    alignSelf: 'center',
  },
  clearButtonText: {
    ...typography.small,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },

  placeholder: {
    marginTop: spacing.md,
    borderWidth: 2,
    borderColor: colors.primary + '30',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.horizontal,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primary + '05',
  },
  placeholderIcon: {
    paddingHorizontal: spacing.horizontal,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary + '20',
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.primary + '40',
  },
  placeholderText: {
    color: colors.textSecondary,
    ...typography.body,
    textAlign: 'center',
    lineHeight: 24,
  },
  placeholderDecorations: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  decorationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  sectionTitle: {
    ...typography.subtitle,
    color: colors.text,
    marginTop: spacing.md,
    fontWeight: typography.weights.bold,
  },
  subtitle: {
    color: colors.textSecondary,
    marginTop: spacing.xs,
    ...typography.body,
  },
  detailedSection: {
    marginTop: spacing.md,
  },
  detailedTitle: {
    ...typography.subtitle,
    color: colors.text,
    marginBottom: spacing.sm,
    fontWeight: typography.weights.bold,
  },

  carouselSection: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  carouselSectionTitle: {
    ...typography.subtitle,
    color: colors.text,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  carouselIndicatorsContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  carouselIndicators: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  activeIndicator: {
    width: 20,
    backgroundColor: colors.primary,
  },
  carouselContainer: {
    position: 'relative',
  },
  carouselContentContainer: {
    paddingHorizontal: spacing.sm,
  },
  carouselItem: {
    paddingHorizontal: spacing.xs,
  },
  carouselCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.horizontal,
    paddingVertical: spacing.sm,
    ...shadows.sm,
    borderWidth: 2,
    borderColor: colors.borderLight,
    borderTopWidth: 3,
    minHeight: 140,
    marginHorizontal: spacing.xs,
  },
  carouselCardActive: {
    ...shadows.lg,
    borderWidth: 4,
    borderColor: colors.primary + '60',
    backgroundColor: colors.primary + '08',
    minHeight: 200,
    paddingHorizontal: spacing.horizontal,
    paddingVertical: spacing.lg,
    transform: [{scale: 1.05}],
  },
  carouselHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  carouselIcon: {
    padding: spacing.xs,
    borderRadius: borderRadius.md,
    marginRight: spacing.xs,
    ...shadows.sm,
  },
  carouselTitle: {
    ...typography.small,
    color: colors.text,
    fontWeight: typography.weights.semibold,
    flex: 1,
    lineHeight: 14,
  },
  carouselTitleActive: {
    ...typography.body,
    fontWeight: typography.weights.bold,
    color: colors.primary,
    lineHeight: 18,
  },
  carouselContent: {
    marginBottom: spacing.sm,
  },
  carouselPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
    paddingVertical: 2,
  },
  carouselPointText: {
    marginLeft: spacing.xs,
    color: colors.text,
    flex: 1,
    ...typography.small,
    lineHeight: 14,
  },
  carouselVideoBtn: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.horizontal,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    ...shadows.md,
    marginTop: spacing.md,
  },
  carouselVideoText: {
    color: colors.white,
    ...typography.caption,
    fontWeight: typography.weights.semibold,
  },
  carouselNavigation: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
    transform: [{translateY: -15}],
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  navButtonDisabled: {
    opacity: 0.3,
  },

  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.horizontal,
    paddingVertical: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.borderLight,
    borderLeftWidth: 6,
    borderLeftColor: colors.primary,
    ...shadows.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionIconContainer: {
    paddingHorizontal: spacing.horizontal,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginRight: spacing.sm,
  },
  sectionItemTitle: {
    ...typography.body,
    color: colors.primary,
    fontWeight: typography.weights.bold,
    flex: 1,
  },
  sectionContent: {
    paddingLeft: spacing.xs,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
    paddingVertical: spacing.xs,
  },
  tipIconContainer: {
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
    marginRight: spacing.sm,
    alignSelf: 'flex-start',
  },
  tipText: {
    color: colors.text,
    flex: 1,
    ...typography.caption,
    lineHeight: 20,
  },

  videoBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.primaryDark,
  },
  videoText: {
    color: colors.white,
    ...typography.body,
    fontWeight: typography.weights.semibold,
  },

  patientBanner: {
    marginHorizontal: spacing.horizontal,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.lg,
    borderWidth: 3,
    borderColor: colors.primary + '80',
  },
  patientBannerGradient: {
    padding: spacing.lg,
  },
  patientBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  patientBannerIconContainer: {
    backgroundColor: colors.white + '30',
    borderRadius: borderRadius.full,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.white + '50',
  },
  patientBannerTextContainer: {
    flex: 1,
  },
  patientBannerTitle: {
    ...typography.subtitle,
    color: colors.white,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.xs,
    fontSize: 18,
  },
  patientBannerSubtitle: {
    ...typography.caption,
    color: colors.white + 'EE',
    lineHeight: 18,
  },
  patientBannerArrow: {
    backgroundColor: colors.white + '20',
    borderRadius: borderRadius.full,
    padding: spacing.sm,
    borderWidth: 2,
    borderColor: colors.white + '40',
  },
  topRowPatient: {
    borderWidth: 2,
    borderColor: colors.primary + '40',
    backgroundColor: colors.primary + '08',
  },
  placeholderPatient: {
    borderWidth: 3,
    borderColor: colors.primary,
    backgroundColor: colors.primary + '15',
    borderStyle: 'dashed',
  },
  placeholderIconPatient: {
    backgroundColor: colors.primary,
    borderColor: colors.white,
  },
  placeholderTextPatient: {
    color: colors.primary,
    fontWeight: typography.weights.semibold,
    fontSize: 15,
  },
});

export default Information;
