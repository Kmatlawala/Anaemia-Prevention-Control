

export function getAnemiaClassification(
  hb,
  ageGroup,
  gender,
  isPregnant = false,
) {
  if (!hb || hb <= 0) {
    return {
      category: 'Unknown',
      severity: 'Unknown',
      description: 'Invalid hemoglobin level',
    };
  }

  let category = 'Unknown';
  let severity = 'Unknown';
  let description = '';

  if (ageGroup === '6-59months' || (ageGroup === '0-5years' && !isPregnant)) {
    
    if (hb >= 11) {
      category = 'Non-Anemia';
      severity = 'Normal';
      description = 'Normal hemoglobin level';
    } else if (hb >= 10 && hb < 11) {
      category = 'Mild Anemia';
      severity = 'Mild';
      description = 'Mild anemia (10-10.9 g/dL)';
    } else if (hb >= 7 && hb < 10) {
      category = 'Moderate Anemia';
      severity = 'Moderate';
      description = 'Moderate anemia (7-9.9 g/dL)';
    } else {
      category = 'Severe Anemia';
      severity = 'Severe';
      description = 'Severe anemia (<7 g/dL)';
    }
  } else if (ageGroup === '5-11years') {
    
    if (hb >= 11.5) {
      category = 'Non-Anemia';
      severity = 'Normal';
      description = 'Normal hemoglobin level';
    } else if (hb >= 11 && hb < 11.5) {
      category = 'Mild Anemia';
      severity = 'Mild';
      description = 'Mild anemia (11-11.4 g/dL)';
    } else if (hb >= 8 && hb < 11) {
      category = 'Moderate Anemia';
      severity = 'Moderate';
      description = 'Moderate anemia (8-10.9 g/dL)';
    } else {
      category = 'Severe Anemia';
      severity = 'Severe';
      description = 'Severe anemia (<8 g/dL)';
    }
  } else if (ageGroup === '12-14years') {
    
    if (hb >= 12) {
      category = 'Non-Anemia';
      severity = 'Normal';
      description = 'Normal hemoglobin level';
    } else if (hb >= 11 && hb < 12) {
      category = 'Mild Anemia';
      severity = 'Mild';
      description = 'Mild anemia (11-11.9 g/dL)';
    } else if (hb >= 8 && hb < 11) {
      category = 'Moderate Anemia';
      severity = 'Moderate';
      description = 'Moderate anemia (8-10.9 g/dL)';
    } else {
      category = 'Severe Anemia';
      severity = 'Severe';
      description = 'Severe anemia (<8 g/dL)';
    }
  } else if (gender === 'female' && !isPregnant) {
    
    if (hb >= 12) {
      category = 'Non-Anemia';
      severity = 'Normal';
      description = 'Normal hemoglobin level';
    } else if (hb >= 11 && hb < 12) {
      category = 'Mild Anemia';
      severity = 'Mild';
      description = 'Mild anemia (11-11.9 g/dL)';
    } else if (hb >= 8 && hb < 11) {
      category = 'Moderate Anemia';
      severity = 'Moderate';
      description = 'Moderate anemia (8-10.9 g/dL)';
    } else {
      category = 'Severe Anemia';
      severity = 'Severe';
      description = 'Severe anemia (<8 g/dL)';
    }
  } else if (isPregnant) {
    
    if (hb >= 11) {
      category = 'Non-Anemia';
      severity = 'Normal';
      description = 'Normal hemoglobin level';
    } else if (hb >= 10 && hb < 11) {
      category = 'Mild Anemia';
      severity = 'Mild';
      description = 'Mild anemia (10-10.9 g/dL)';
    } else if (hb >= 7 && hb < 10) {
      category = 'Moderate Anemia';
      severity = 'Moderate';
      description = 'Moderate anemia (7-9.9 g/dL)';
    } else {
      category = 'Severe Anemia';
      severity = 'Severe';
      description = 'Severe anemia (<7 g/dL)';
    }
  } else if (gender === 'male') {
    
    if (hb >= 13) {
      category = 'Non-Anemia';
      severity = 'Normal';
      description = 'Normal hemoglobin level';
    } else if (hb >= 11 && hb < 13) {
      category = 'Mild Anemia';
      severity = 'Mild';
      description = 'Mild anemia (11-12.9 g/dL)';
    } else if (hb >= 8 && hb < 11) {
      category = 'Moderate Anemia';
      severity = 'Moderate';
      description = 'Moderate anemia (8-10.9 g/dL)';
    } else {
      category = 'Severe Anemia';
      severity = 'Severe';
      description = 'Severe anemia (<8 g/dL)';
    }
  }

  return {
    category,
    severity,
    description,
    hb,
    ageGroup,
    gender,
    isPregnant,
  };
}

export function getAgeGroup(age, gender, isPregnant = false) {
  if (isPregnant) {
    return 'pregnant-women';
  }

  if (age < 1) {
    return '6-59months';
  } else if (age >= 1 && age < 5) {
    return '6-59months';
  } else if (age >= 5 && age < 12) {
    return '5-11years';
  } else if (age >= 12 && age < 15) {
    return '12-14years';
  } else {
    return gender === 'male' ? 'men' : 'non-pregnant-women';
  }
}

export function getAnemiaColor(severity) {
  switch (severity) {
    case 'Normal':
      return '#4CAF50'; 
    case 'Mild':
      return '#FF9800'; 
    case 'Moderate':
      return '#FF5722'; 
    case 'Severe':
      return '#F44336'; 
    default:
      return '#9E9E9E'; 
  }
}

export function getAnemiaPriority(severity) {
  switch (severity) {
    case 'Severe':
      return 1;
    case 'Moderate':
      return 2;
    case 'Mild':
      return 3;
    case 'Normal':
      return 4;
    default:
      return 5;
  }
}
