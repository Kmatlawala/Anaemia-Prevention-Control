// src/screens/Information.js
import React, {useMemo, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Dimensions,
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

const {width: screenWidth} = Dimensions.get('window');

/** -------- Content (EN / GU / HI) -------- */
const CONTENT = {
  pregnant: {
    en: {
      title: 'Pregnant Women',
      subtitle: 'IFA • ANC • Nutrition',
      video: 'https://youtu.be/asNax0ZpcMs?si=cX1t3dPEZnpfIiPN',
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
            'Eat iron and protein-rich foods',
            'Include vitamin C-rich foods',
            'Avoid tea/coffee near meals',
          ],
        },
        {
          title: 'Side Effect Management',
          points: [
            'Mild constipation/dark stools are normal',
            'Take IFA after meals if nausea occurs',
            'Report severe side effects to health worker',
          ],
        },
        {
          title: 'Deworming',
          points: [
            'Take albendazole once during pregnancy (2nd trimester) as advised',
            'Maintain hygiene',
          ],
        },
        {
          title: 'ANC and Danger Signs',
          points: [
            'Attend all ANC checkups',
            'Take adequate rest and balanced diet',
            'Report danger signs: breathing difficulty, palpitations, dizziness, bleeding',
          ],
        },
        {
          title: 'Follow-up',
          points: [
            'Regular Hb testing at intervals',
            'Keep ID/application code for records',
          ],
        },
      ],
    },
    gu: {
      title: 'ગર્ભવતી સ્ત્રીઓ',
      subtitle: 'IFA • ANC • પોષણ',
      video: 'https://youtu.be/asNax0ZpcMs?si=cX1t3dPEZnpfIiPN',
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
          title: 'આહાર સલાહ',
          points: [
            'આયર્ન અને પ્રોટીન સમૃદ્ધ ખોરાક ખાઓ',
            'વિટામિન સી-સમૃદ્ધ ખોરાકનો સમાવેશ કરો',
            'ભોજનની નજીક ચા/કોફી ટાળો',
          ],
        },
        {
          title: 'આડઅસર વ્યવસ્થાપન',
          points: [
            'હળવો કબજિયાત/કાળા સ્ટૂલ સામાન્ય છે',
            'જો ઉબકા આવે તો ભોજન પછી આઇએફએ લો',
            'ગંભીર આડઅસરોની જાણ આરોગ્ય કાર્યકરને કરો',
          ],
        },
        {
          title: 'કૃમિનાશક',
          points: [
            'સલાહ મુજબ ગર્ભાવસ્થા દરમિયાન (બીજા ત્રિમાસિકમાં) એકવાર આલ્બેન્ડાઝોલ લો',
            'સ્વચ્છતા જાળવો',
          ],
        },
        {
          title: 'એએનસી અને જોખમી ચિહ્નો',
          points: [
            'તમામ એએનસી (ANC) તપાસમાં હાજરી આપો',
            'પૂરતો આરામ અને સંતુલિત આહાર લો',
            'જોખમી ચિહ્નોની જાણ કરો: શ્વાસ લેવામાં તકલીફ, ધબકારા, ચક્કર આવવા, રક્તસ્રાવ',
          ],
        },
        {
          title: 'ફોલો-અપ',
          points: [
            'નિયમિત અંતરાલે નિયમિત Hb પરીક્ષણ',
            'રેકોર્ડ માટે આઈડી/એપ્લિકેશન કોડ સાથે રાખો',
          ],
        },
      ],
    },
    hi: {
      title: 'गर्भवती महिलाएँ',
      subtitle: 'IFA • ANC • पोषण',
      video: 'https://youtu.be/asNax0ZpcMs?si=cX1t3dPEZnpfIiPN',
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
          title: 'आहार सलाह',
          points: [
            'आयरन और प्रोटीन युक्त भोजन खाएँ',
            'विटामिन सी युक्त भोजन शामिल करें',
            'भोजन के पास चाय/कॉफी से बचें',
          ],
        },
        {
          title: 'साइड इफेक्ट प्रबंधन',
          points: [
            'हल्का कब्ज/काले मल सामान्य है',
            'उल्टी आए तो भोजन के बाद आईएफए लें',
            'गंभीर साइड इफेक्ट्स की जानकारी स्वास्थ्य कर्मी को दें',
          ],
        },
        {
          title: 'कृमिनाशक',
          points: [
            'सलाह अनुसार गर्भावस्था के दौरान (दूसरी तिमाही में) एक बार अल्बेंडाज़ोल लें',
            'स्वच्छता बनाए रखें',
          ],
        },
        {
          title: 'एएनसी और खतरे के संकेत',
          points: [
            'सभी एएनसी जाँच में उपस्थित रहें',
            'पर्याप्त आराम और संतुलित आहार लें',
            'खतरे के संकेतों की जानकारी दें: साँस लेने में तकलीफ, धड़कन, चक्कर, रक्तस्राव',
          ],
        },
        {
          title: 'फॉलो-अप',
          points: [
            'नियमित अंतराल पर Hb जाँच',
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
      video: 'https://youtu.be/asNax0ZpcMs?si=cX1t3dPEZnpfIiPN',
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
            'Encourage iron-rich complementary foods (dal, ragi, green leafy vegetables, eggs)',
            'Give vitamin C-rich foods (oranges, lemons, sour fruits) with meals',
          ],
        },
        {
          title: 'Deworming',
          points: [
            'Give albendazole every 6 months after 1 year of age',
            'Maintain hygiene and hand washing',
          ],
        },
        {
          title: 'Growth & Health Monitoring',
          points: [
            'Regular weight/height monitoring',
            'Watch for signs of weakness, poor appetite and frequent infections',
          ],
        },
      ],
    },
    gu: {
      title: '૫ વર્ષથી ઓછા બાળકો',
      subtitle: 'સ્તનપાન • પુરક આહાર',
      video: 'https://youtu.be/asNax0ZpcMs?si=cX1t3dPEZnpfIiPN',
      sections: [
        {
          title: 'આઇએફએ સપ્લિમેન્ટેશન',
          points: [
            'શેડ્યૂલ મુજબ 6 મહિનાથી આઇએફએ સીરપ/ગોળીઓ શરૂ કરો',
            'શિફારસ કરેલ ડોઝ અનુસરો',
          ],
        },
        {
          title: 'આહાર સલાહ',
          points: [
            'આયર્ન સમૃદ્ધ પૂરક ખોરાક (દાળ, રાગી, લીલા પાંદડાવાળા શાકભાજી, ઇંડા) ને પ્રોત્સાહિત કરો',
            'ભોજન સાથે વિટામિન સી-સમૃદ્ધ ખોરાક (આમળા, લીંબુ, ખાટા ફળો) આપો',
          ],
        },
        {
          title: 'કૃમિનાશક',
          points: [
            '1 વર્ષની ઉંમર પછી દર 6 મહિને આલ્બેન્ડાઝોલ આપો',
            'સ્વચ્છતા અને હાથ ધોવાનું જાળવો',
          ],
        },
        {
          title: 'વૃદ્ધિ અને આરોગ્ય દેખરેખ',
          points: [
            'વજન/ઊંચાઈનું નિયમિત નિરીક્ષણ',
            'ફીકાશ, ઓછી ભૂખ અને વારંવાર ચેપના ચિહ્નો પર ધ્યાન આપો',
          ],
        },
      ],
    },
    hi: {
      title: '५ वर्ष से कम बच्चे',
      subtitle: 'स्तनपान • पूरक आहार',
      video: 'https://youtu.be/asNax0ZpcMs?si=cX1t3dPEZnpfIiPN',
      sections: [
        {
          title: 'आईएफए सप्लीमेंटेशन',
          points: [
            'शेड्यूल के अनुसार 6 महीने से आईएफए सिरप/गोलियाँ शुरू करें',
            'सुझाई गई खुराक का पालन करें',
          ],
        },
        {
          title: 'आहार सलाह',
          points: [
            'आयरन युक्त पूरक आहार (दाल, रागी, हरी पत्तेदार सब्जियाँ, अंडे) को प्रोत्साहित करें',
            'भोजन के साथ विटामिन सी युक्त भोजन (संतरे, नींबू, खट्टे फल) दें',
          ],
        },
        {
          title: 'कृमिनाशक',
          points: [
            '1 साल की उम्र के बाद हर 6 महीने में अल्बेंडाज़ोल दें',
            'स्वच्छता और हाथ धोना बनाए रखें',
          ],
        },
        {
          title: 'वृद्धि और स्वास्थ्य निगरानी',
          points: [
            'वजन/ऊँचाई की नियमित निगरानी',
            'कमज़ोरी, कम भूख और बार-बार संक्रमण के लक्षणों पर ध्यान दें',
          ],
        },
      ],
    },
  },
  adolescent: {
    en: {
      title: 'Adolescent Girls',
      subtitle: 'Weekly IFA • Healthy diet',
      video: 'https://youtu.be/asNax0ZpcMs?si=cX1t3dPEZnpfIiPN',
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
            'Avoid tea/coffee near meals',
          ],
        },
        {
          title: 'Deworming',
          points: ['Take albendazole every 6 months', 'Maintain hand hygiene'],
        },
        {
          title: 'Menstrual Health',
          points: [
            'Maintain hygiene during menstruation',
            'Report excessive bleeding or irregular menstrual cycle',
          ],
        },
        {
          title: 'Follow-up',
          points: [
            'Regular Hb testing in school/community',
            'Report any IFA side effects',
          ],
        },
      ],
    },
    gu: {
      title: 'કિશોરીઓ',
      subtitle: 'સપ્તાહિક IFA • હેલ્ધી ડાયેટ',
      video: 'https://youtu.be/asNax0ZpcMs?si=cX1t3dPEZnpfIiPN',
      sections: [
        {
          title: 'આઇએફએ સપ્લિમેન્ટેશન',
          points: [
            'અઠવાડિયામાં 1 આઇએફએ ટેબ્લેટ લો (WIFS કાર્યક્રમ મુજબ)',
            'જો ચૂકી જાઓ તો ડબલ-ડોઝ ન લો',
          ],
        },
        {
          title: 'આહાર સલાહ',
          points: [
            'આયર્ન સમૃદ્ધ ખોરાક ખાઓ (લીલા પાંદડાવાળા શાકભાજી, ગોળ, મગફળી, કઠોળ, રાગી, ખજૂર, માંસ, ઇંડા)',
            'ભોજન સાથે વિટામિન સી-સમૃદ્ધ ખોરાક લો',
            'ભોજનની નજીક ચા/કોફી ટાળો',
          ],
        },
        {
          title: 'કૃમિનાશક',
          points: ['દર 6 મહિને આલ્બેન્ડાઝોલ લો', 'હાથની સ્વચ્છતા જાળવો'],
        },
        {
          title: 'માસિક સ્રાવ સ્વાસ્થ્ય',
          points: [
            'માસિક સ્રાવ દરમિયાન સ્વચ્છતા જાળવો',
            'વધુ પડતું રક્તસ્રાવ અથવા અનિયમિત માસિક ચક્રની જાણ કરો',
          ],
        },
        {
          title: 'ફોલો-અપ',
          points: [
            'શાળા/સમુદાયમાં નિયમિત Hb પરીક્ષણ',
            'જો IFA ની કોઈ આડઅસર હોય તો તેની જાણ કરો',
          ],
        },
      ],
    },
    hi: {
      title: 'किशोरियाँ',
      subtitle: 'साप्ताहिक IFA • हेल्दी डाइट',
      video: 'https://youtu.be/asNax0ZpcMs?si=cX1t3dPEZnpfIiPN',
      sections: [
        {
          title: 'आईएफए सप्लीमेंटेशन',
          points: [
            'सप्ताह में 1 आईएफए टैबलेट लें (WIFS कार्यक्रम के अनुसार)',
            'भूल जाएँ तो डबल-डोज़ न लें',
          ],
        },
        {
          title: 'आहार सलाह',
          points: [
            'आयरन युक्त भोजन खाएँ (हरी पत्तेदार सब्जियाँ, गुड़, मूँगफली, दालें, रागी, खजूर, मांस, अंडे)',
            'भोजन के साथ विटामिन सी युक्त भोजन लें',
            'भोजन के पास चाय/कॉफी से बचें',
          ],
        },
        {
          title: 'कृमिनाशक',
          points: [
            'हर 6 महीने में अल्बेंडाज़ोल लें',
            'हाथ की स्वच्छता बनाए रखें',
          ],
        },
        {
          title: 'मासिक धर्म स्वास्थ्य',
          points: [
            'मासिक धर्म के दौरान स्वच्छता बनाए रखें',
            'अत्यधिक रक्तस्राव या अनियमित मासिक चक्र की जानकारी दें',
          ],
        },
        {
          title: 'फॉलो-अप',
          points: [
            'स्कूल/समुदाय में नियमित Hb जाँच',
            'किसी भी आईएफए साइड इफेक्ट की जानकारी दें',
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
  const [lang, setLang] = useState('gu'); // default GU
  const [category, setCategory] = useState(''); // default none

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

  const carouselData = useMemo(() => {
    if (!section || !section.sections || !Array.isArray(section.sections))
      return [];
    return section.sections.map((sectionItem, index) => ({
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
        {/* Top: title + language */}
        <View style={styles.topRow}>
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

        {/* Card with category selection + dynamic content */}
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
            <View style={styles.placeholder}>
              <View style={styles.placeholderIcon}>
                <Icon
                  name="information-outline"
                  size={40}
                  color={colors.primary}
                />
              </View>
              <Text style={styles.placeholderText}>
                Select a category to see detailed information and key messages.
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

              {/* Key Information Cards */}
              {carouselData.length > 0 && (
                <View style={styles.keyInfoSection}>
                  <Text style={styles.keyInfoTitle}>Key Information</Text>
                  <View style={styles.keyInfoGrid}>
                    {carouselData.slice(0, 3).map((item, index) => (
                      <View key={index} style={styles.keyInfoCard}>
                        <View style={styles.keyInfoHeader}>
                          <View
                            style={[
                              styles.keyInfoIcon,
                              {backgroundColor: getCategoryColor() + '20'},
                            ]}>
                            <Icon
                              name="lightbulb-outline"
                              size={20}
                              color={getCategoryColor()}
                            />
                          </View>
                          <Text style={styles.keyInfoCardTitle}>
                            {item.title}
                          </Text>
                        </View>
                        <View style={styles.keyInfoContent}>
                          {item.points.slice(0, 2).map((point, pointIndex) => (
                            <View key={pointIndex} style={styles.keyInfoPoint}>
                              <Icon
                                name="check-circle"
                                size={14}
                                color={colors.success}
                              />
                              <Text style={styles.keyInfoPointText}>
                                {point}
                              </Text>
                            </View>
                          ))}
                        </View>
                        {item.video && (
                          <TouchableOpacity
                            onPress={() => Linking.openURL(item.video)}
                            style={[
                              styles.keyInfoVideoBtn,
                              {backgroundColor: getCategoryColor()},
                            ]}>
                            <Icon name="play" size={14} color={colors.white} />
                            <Text style={styles.keyInfoVideoText}>Video</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Detailed sections */}
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
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: spacing.md,
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
    paddingHorizontal: spacing.md,
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
    margin: spacing.xs,
    padding: spacing.md,
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
    padding: spacing.md,
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
  categoryIconContainer: {
    padding: spacing.md,
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
    paddingHorizontal: spacing.md,
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
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primary + '05',
  },
  placeholderIcon: {
    padding: spacing.md,
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

  keyInfoSection: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  keyInfoTitle: {
    ...typography.subtitle,
    color: colors.text,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  keyInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  keyInfoCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    width: '48%',
    ...shadows.md,
    borderWidth: 2,
    borderColor: colors.borderLight,
    borderTopWidth: 4,
    borderTopColor: colors.primary,
  },
  keyInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  keyInfoIcon: {
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
    marginRight: spacing.xs,
  },
  keyInfoCardTitle: {
    ...typography.caption,
    color: colors.text,
    fontWeight: typography.weights.semibold,
    flex: 1,
  },
  keyInfoContent: {
    marginBottom: spacing.sm,
  },
  keyInfoPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  keyInfoPointText: {
    marginLeft: spacing.xs,
    color: colors.text,
    flex: 1,
    ...typography.small,
    lineHeight: 16,
  },
  keyInfoVideoBtn: {
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
    ...shadows.sm,
  },
  keyInfoVideoText: {
    color: colors.white,
    ...typography.small,
    fontWeight: typography.weights.semibold,
  },

  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
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
    padding: spacing.sm,
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
});

export default Information;
