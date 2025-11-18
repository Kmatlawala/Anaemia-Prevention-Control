

import {API} from './api';
import {sendNativeSMS} from './fixedSMS';

export async function sendOTPViaBackend(phoneNumber) {
  try {
    
    const formattedPhone = phoneNumber.startsWith('+')
      ? phoneNumber
      : `+91${phoneNumber}`;

    const response = await API.sendOTP({
      phoneNumber: formattedPhone,
    });

    if (response.success) {
      
      if (response.otp) {
        try {
          const smsMessage = `Your Animia OTP is: ${response.otp}. Valid for 5 minutes. Do not share with anyone.`;
          
          const smsResult = await sendNativeSMS(formattedPhone, smsMessage);

          if (smsResult) {
            } else {
            }
        } catch (smsError) {
          
        }
      }

      return {
        success: true,
        message: response.message || 'OTP sent successfully',
        expiresIn: response.expiresIn || 300, 
        
        ...(response.otp && {otp: response.otp}),
      };
    } else {
      return {
        success: false,
        error: response.message || 'Failed to send OTP',
      };
    }
  } catch (error) {
    
    if (error.status === 429) {
      return {
        success: false,
        error: error.data?.message || 'Too many OTP requests. Please wait.',
        cooldown: error.data?.cooldown,
      };
    }

    return {
      success: false,
      error: 'Failed to send OTP. Please try again.',
    };
  }
}

export async function verifyBackendOTP(phoneNumber, otp) {
  try {
    
    const formattedPhone = phoneNumber.startsWith('+')
      ? phoneNumber
      : `+91${phoneNumber}`;

    const response = await API.verifyOTP({
      phoneNumber: formattedPhone,
      otp: otp,
    });

    if (response.success) {
      return {
        success: true,
        message: response.message || 'OTP verified successfully',
      };
    } else {
      return {
        success: false,
        error: response.message || 'Invalid OTP',
        remainingAttempts: response.remainingAttempts,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.data?.message || 'Failed to verify OTP. Please try again.',
      remainingAttempts: error.data?.remainingAttempts,
    };
  }
}

export async function resendOTP(phoneNumber) {
  try {
    
    const formattedPhone = phoneNumber.startsWith('+')
      ? phoneNumber
      : `+91${phoneNumber}`;

    const response = await API.resendOTP({
      phoneNumber: formattedPhone,
    });

    if (response.success) {
      
      if (response.otp) {
        try {
          const smsMessage = `Your Animia OTP is: ${response.otp}. Valid for 5 minutes. Do not share with anyone.`;
          
          const smsResult = await sendNativeSMS(formattedPhone, smsMessage);

          if (smsResult) {
            } else {
            }
        } catch (smsError) {
          
        }
      }

      return {
        success: true,
        message: response.message || 'OTP resent successfully',
        expiresIn: response.expiresIn || 300,
        ...(response.otp && {otp: response.otp}),
      };
    } else {
      return {
        success: false,
        error: response.message || 'Failed to resend OTP',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.data?.message || 'Failed to resend OTP. Please try again.',
    };
  }
}

export async function sendOTPViaEmail(email) {
  try {
    
    const normalizedEmail = email.toLowerCase().trim();

    const response = await API.sendEmailOTP({
      email: normalizedEmail,
    });

    if (response.success) {
      return {
        success: true,
        message: response.message || 'OTP sent successfully to email',
        expiresIn: response.expiresIn || 300, 
        
        ...(response.otp && {otp: response.otp}),
      };
    } else {
      return {
        success: false,
        error: response.message || 'Failed to send OTP',
      };
    }
  } catch (error) {
    
    if (error.status === 429) {
      return {
        success: false,
        error: error.data?.message || 'Too many OTP requests. Please wait.',
        cooldown: error.data?.cooldown,
      };
    }

    return {
      success: false,
      error: 'Failed to send OTP. Please try again.',
    };
  }
}

export async function verifyEmailOTP(email, otp) {
  try {
    
    const normalizedEmail = email.toLowerCase().trim();

    const response = await API.verifyEmailOTP({
      email: normalizedEmail,
      otp: otp,
    });

    if (response.success) {
      return {
        success: true,
        message: response.message || 'OTP verified successfully',
      };
    } else {
      return {
        success: false,
        error: response.message || 'Invalid OTP',
        remainingAttempts: response.remainingAttempts,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.data?.message || 'Failed to verify OTP. Please try again.',
      remainingAttempts: error.data?.remainingAttempts,
    };
  }
}

export async function resendEmailOTP(email) {
  try {
    
    const normalizedEmail = email.toLowerCase().trim();

    const response = await API.resendEmailOTP({
      email: normalizedEmail,
    });

    if (response.success) {
      return {
        success: true,
        message: response.message || 'OTP resent successfully to email',
        expiresIn: response.expiresIn || 300,
        ...(response.otp && {otp: response.otp}),
      };
    } else {
      return {
        success: false,
        error: response.message || 'Failed to resend OTP',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.data?.message || 'Failed to resend OTP. Please try again.',
    };
  }
}

export async function sendOTPViaBeneficiarySMS(phoneNumber, name = 'User') {
  try {
    
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const response = await API.storeBeneficiarySMS({
      phone: phoneNumber,
      name: name,
      message: `Your Animia OTP is: ${otp}. Valid for 5 minutes.`,
      type: 'otp',
      timestamp: new Date().toISOString(),
    });

    if (response.success) {
      return {
        success: true,
        otp: otp,
        message: 'OTP sent via beneficiary SMS service',
      };
    } else {
      return {
        success: false,
        error: 'Failed to send OTP via beneficiary SMS',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: 'Failed to send OTP. Please try again.',
    };
  }
}
