

export function getIFARecommendation(
  age,
  gender,
  isPregnant,
  isLactating,
  anemiaCategory,
) {
  const recommendation = {
    shouldSupplement: false,
    dosage: null,
    frequency: null,
    duration: null,
    formulation: null,
    color: null,
    notes: [],
    contraindications: [],
    specialInstructions: [],
  };

  const needsIFA = shouldRecommendIFA(
    age,
    gender,
    isPregnant,
    isLactating,
    anemiaCategory,
  );

  if (!needsIFA) {
    recommendation.notes.push(
      'IFA supplementation not recommended for this category',
    );
    return recommendation;
  }

  if (isPregnant || isLactating) {
    
    recommendation.shouldSupplement = true;
    recommendation.dosage = '1 iron and folic acid tablet';
    recommendation.frequency = 'Daily';
    recommendation.duration =
      'From 4th month of pregnancy + 180 days postpartum';
    recommendation.formulation = 'Iron and folic acid tablet';
    recommendation.color = 'Red color, sugar-coated';
    recommendation.notes.push(
      'Each tablet contains 60 mg elemental iron + 500 µg folic acid',
    );
    recommendation.notes.push(
      'Start from 4th month of pregnancy (second trimester)',
    );
    recommendation.notes.push(
      'Continue throughout pregnancy (minimum 180 days during pregnancy)',
    );
    recommendation.notes.push('Continue for 180 days postpartum');
    recommendation.specialInstructions.push(
      'All women in reproductive age group advised to have 400 µg folic acid tablets daily to reduce neural tube defects',
    );
  } else if (age >= 0.5 && age < 5) {
    
    recommendation.shouldSupplement = true;
    recommendation.dosage = '1 mL iron and folic acid syrup';
    recommendation.frequency = 'Biweekly (twice a week)';
    recommendation.duration = 'Continuous';
    recommendation.formulation = 'Iron and folic acid syrup';
    recommendation.color = 'Auto-dispenser bottle (50 mL)';
    recommendation.notes.push(
      'Each mL contains 20 mg elemental Iron + 100 µg folic acid',
    );
    recommendation.notes.push(
      'Bottle should have auto-dispenser and information leaflet',
    );
    recommendation.contraindications.push(
      'Withhold during acute illness (fever, diarrhea, pneumonia)',
    );
    recommendation.contraindications.push(
      'Withhold in known thalassemia major/history of repeated blood transfusion',
    );
    recommendation.specialInstructions.push(
      'Continue as per SAM management protocol for SAM children',
    );
  } else if (age >= 5 && age < 10) {
    
    recommendation.shouldSupplement = true;
    recommendation.dosage = '1 iron and folic acid tablet';
    recommendation.frequency = 'Weekly';
    recommendation.duration = 'Continuous';
    recommendation.formulation = 'Iron and folic acid tablet';
    recommendation.color = 'Pink color, sugar-coated';
    recommendation.notes.push(
      'Each tablet contains 45 mg elemental iron + 400 µg folic acid',
    );
  } else if (age >= 10 && age < 20) {
    
    recommendation.shouldSupplement = true;
    recommendation.dosage = '1 iron and folic acid tablet';
    recommendation.frequency = 'Weekly';
    recommendation.duration = 'Continuous';
    recommendation.formulation = 'Iron and folic acid tablet';
    recommendation.color = gender === 'female' ? 'Red color' : 'Blue color';
    recommendation.notes.push(
      'Each tablet contains 60 mg elemental iron + 500 µg folic acid',
    );
    recommendation.notes.push('Sugar-coated tablet');

    if (gender === 'female') {
      recommendation.specialInstructions.push(
        'All women in reproductive age group advised to have 400 µg folic acid tablets daily to reduce neural tube defects',
      );
    }
  } else if (
    age >= 20 &&
    age < 50 &&
    gender === 'female' &&
    !isPregnant &&
    !isLactating
  ) {
    
    recommendation.shouldSupplement = true;
    recommendation.dosage = '1 iron and folic acid tablet';
    recommendation.frequency = 'Weekly';
    recommendation.duration = 'Continuous';
    recommendation.formulation = 'Iron and folic acid tablet';
    recommendation.color = 'Red color, sugar-coated';
    recommendation.notes.push(
      'Each tablet contains 60 mg elemental iron + 500 µg folic acid',
    );
  }

  return recommendation;
}

function shouldRecommendIFA(
  age,
  gender,
  isPregnant,
  isLactating,
  anemiaCategory,
) {
  
  if (age >= 0.5 && age < 5) return true; 
  if (age >= 5 && age < 10) return true; 
  if (age >= 10 && age < 20) return true; 
  if (
    age >= 20 &&
    age < 50 &&
    gender === 'female' &&
    !isPregnant &&
    !isLactating
  )
    return true; 
  if (isPregnant || isLactating) return true; 

  return false;
}

export function getIFAPriority(anemiaCategory, isPregnant, isLactating) {
  if (isPregnant || isLactating) return 1; 
  if (anemiaCategory === 'Severe Anemia') return 1;
  if (anemiaCategory === 'Moderate Anemia') return 2;
  if (anemiaCategory === 'Mild Anemia') return 3;
  return 4; 
}

export function getIFAPriorityColor(priority) {
  switch (priority) {
    case 1:
      return '#F44336'; 
    case 2:
      return '#FF9800'; 
    case 3:
      return '#FFC107'; 
    case 4:
      return '#4CAF50'; 
    default:
      return '#9E9E9E'; 
  }
}

export function getIFAAgeGroup(age, gender, isPregnant, isLactating) {
  if (isPregnant) return 'Pregnant women';
  if (isLactating) return 'Lactating mothers (0-6 months postpartum)';
  if (age >= 0.5 && age < 5) return 'Children 6-59 months';
  if (age >= 5 && age < 10) return 'Children 5-9 years';
  if (age >= 10 && age < 20) return 'Adolescents 10-19 years';
  if (age >= 20 && age < 50 && gender === 'female')
    return 'Women of reproductive age (20-49 years)';
  return 'Other age groups';
}
