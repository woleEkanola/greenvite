'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Users, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import Swal from 'sweetalert2'

interface Attendee {
  id: string
  name: string
  email: string
  phone: string
  code: string
  rsvpStatus: string
  tableId: string | null
  tableName: string | null
  attended: boolean
  attendedAt: string | null
  createdAt: string
  updatedAt: string
  isHallAdmitted: boolean
  hallAdmittedAt: string | null
  metadata: any
}

interface Table {
  id: string
  name: string
  capacity: number
  guestCount: number
}

interface AssociatedAttendee {
  id: string
  name: string
  code: string
  rsvpStatus: string
  attended: boolean
  cleanName?: string
  relationshipType?: string | null
  hasGuest?: boolean
  hasDriver?: boolean
  hasAide?: boolean
}

export default function AttendeeDetailsPage({ params }: { params: { id: string, 'access-code': string } }) {
  const router = useRouter()
  const eventId = params.id
  const accessCode = params['access-code']
  
  const [loading, setLoading] = useState(true)
  const [attendee, setAttendee] = useState<Attendee | null>(null)
  const [event, setEvent] = useState<any>(null)
  const [associatedAttendees, setAssociatedAttendees] = useState<AssociatedAttendee[]>([])
  const [admittingGate, setAdmittingGate] = useState(false)
  const [admittingHall, setAdmittingHall] = useState(false)
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Fetch event details
        const eventResponse = await fetch(`/api/admin/events/${eventId}`)
        if (!eventResponse.ok) {
          throw new Error('Failed to fetch event details')
        }
        const eventData = await eventResponse.json()
        setEvent(eventData)
        
        // Use the code as-is without normalization
        const code = accessCode
        console.log(`Fetching attendee with access code: ${code}`)
        
        // Try to fetch by access code
        let attendeeResponse = await fetch(`/api/admin/events/${eventId}/attendees/by-access-code/${code}`)
        
        // If that fails, try the other endpoints as fallbacks
        if (!attendeeResponse.ok) {
          console.log('Access code lookup failed, trying invite code lookup')
          attendeeResponse = await fetch(`/api/admin/events/${eventId}/attendees/by-code/${code}`)
          
          if (!attendeeResponse.ok) {
            console.log('Invite code lookup failed, trying registration code lookup')
            attendeeResponse = await fetch(`/api/admin/events/${eventId}/attendees/by-registration-code/${code}`)
          }
        }
        
        if (!attendeeResponse.ok) {
          console.error('Error response from API:', await attendeeResponse.text())
          throw new Error('Attendee not found')
        }
        
        const attendeeData = await attendeeResponse.json()
        
        if (!attendeeData.success || !attendeeData.attendee) {
          console.error('Invalid data returned from API:', attendeeData)
          throw new Error('Invalid attendee data returned')
        }
        
        // Clean up attendee name by removing relationship suffixes
        const attendeeWithCleanName = {
          ...attendeeData.attendee,
          name: cleanAttendeeNameForDisplay(attendeeData.attendee.name)
        }
        
        setAttendee(attendeeWithCleanName)
        
        // Fetch associated attendees (same email or phone)
        if (attendeeData.attendee) {
          const associatedResponse = await fetch(
            `/api/admin/events/${eventId}/attendees/associated/${attendeeData.attendee.id}`
          )
          if (associatedResponse.ok) {
            const associatedData = await associatedResponse.json()
            console.log('Raw associated attendees data:', JSON.stringify(associatedData, null, 2))
            
            // Process the real attendees
            let attendeesToProcess = associatedData.attendees || [];
            
            // Only use the test attendee if no real attendees are found
            if (attendeesToProcess.length === 0 && process.env.NODE_ENV === 'development') {
              console.log('No associated attendees found, adding a test attendee in development mode');
              // Add a test attendee only in development mode
              attendeesToProcess = [{
                id: 'test-id',
                name: 'Test Attendee',
                email: 'test@example.com',
                phone: '1234567890',
                code: 'TEST123',
                status: 'attending',
                attended: false,
                hasGuest: true,
                hasDriver: true,
                hasAide: true
              }];
            }
            
            // Add relationship type to associated attendees
            const processedAssociatedAttendees = attendeesToProcess.map((associate: AssociatedAttendee) => {
              console.log('Processing associate:', JSON.stringify(associate, null, 2))
              return {
                ...associate,
                cleanName: cleanAttendeeNameForDisplay(associate.name),
                relationshipType: determineRelationshipType(associate.name)
              }
            })
            setAssociatedAttendees(processedAssociatedAttendees)
            console.log('Processed associated attendees:', JSON.stringify(processedAssociatedAttendees, null, 2))
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        // Don't show an error alert, the UI will handle the null attendee state
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [eventId, accessCode])
  
  // Helper function to clean attendee names for display
  const cleanAttendeeNameForDisplay = (name: string) => {
    // Remove "'s Guest", "'s Driver", "'s Aide" suffixes
    let cleanName = name.replace(/'s\s+(Guest|Driver|Aide|Aid)$/i, '');
    
    // Remove text in parentheses like "(Guest)" or "(Primary)"
    cleanName = cleanName.replace(/\s*\([^)]*\)\s*$/, '');
    
    return cleanName.trim();
  }
  
  // Helper function to determine relationship type
  const determineRelationshipType = (name: string) => {
    const nameLower = name.toLowerCase();
    
    if (nameLower.includes('guest')) {
      return 'Guest';
    } else if (nameLower.includes('driver')) {
      return 'Driver';
    } else if (nameLower.includes('aid') || nameLower.includes('aide')) {
      return 'Aide';
    }
    
    return null;
  }
  
  // Handle gate admission
  const handleGateAdmit = async () => {
    try {
      if (!attendee) return
      
      setAdmittingGate(true)
      
      const response = await fetch(`/api/admin/events/${eventId}/access-codes/admit-gate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ codeId: attendee.id })
      })
      
      if (!response.ok) {
        throw new Error('Failed to admit attendee')
      }
      
      const data = await response.json()
      
      // Log the response data to confirm successful update
      console.log('Gate admission API response:', data)
      
      // Update the attendee object with admission data
      if (attendee) {
        setAttendee({
          ...attendee,
          attended: true,
          attendedAt: new Date().toISOString(),
          tableId: data.accessCode.tableId,
          tableName: data.accessCode.tableName
        });
        
        // Log the updated attendee object
        console.log('Updated attendee object:', {
          id: attendee.id,
          name: attendee.name,
          attended: true,
          attendedAt: new Date().toISOString(),
          tableId: data.accessCode.tableId,
          tableName: data.accessCode.tableName
        });
      }
      
      // Prepare table info for messaging
      const tableInfo = data.accessCode.tableName ? `Your table number is ${data.accessCode.tableName}.` : ''
      
      // Automatically send WhatsApp message if phone is available
      if (data.accessCode.rsvpPhone) {
        try {
          // WhatsApp message with emoji and formatting
          const whatsappMessage = `✅ *Gate Admission Confirmation* ✅\n\nHello *${data.accessCode.name}*,\n\nYou have been successfully admitted to *${event?.title || 'the event'}*.\n\n${tableInfo ? `🪑 *Table Information:* ${tableInfo}\n\n` : ''}\nWelcome and enjoy the event! 🎉\n\n_Sent via Greenvites_`
          
          console.log('Sending WhatsApp message for gate admission...')
          
          const whatsappResponse = await fetch('/api/admin/whatsapp', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              phone: data.accessCode.rsvpPhone,
              message: whatsappMessage,
              eventId: eventId
            })
          })
          
          if (!whatsappResponse.ok) {
            console.error('Failed to send WhatsApp message:', await whatsappResponse.text())
          } else {
            console.log('WhatsApp message sent successfully for gate admission')
          }
        } catch (whatsappError) {
          console.error('Error sending WhatsApp message for gate admission:', whatsappError)
          // Continue execution even if WhatsApp fails
        }
      } else {
        console.log('No phone number available for WhatsApp message')
      }
      
      // Check if a table is assigned
      if (!data.hasTable) {
        // Prompt to assign a table
        Swal.fire({
          icon: 'warning',
          title: 'No Table Assigned',
          text: 'Would you like to assign a table for this attendee?',
          showCancelButton: true,
          confirmButtonText: 'Assign Table',
          cancelButtonText: 'Skip',
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#d33'
        }).then((result) => {
          if (result.isConfirmed) {
            // Redirect to the table assignment page
            router.push(`/admin/dashboard/events/${eventId}/access-codes/${attendee.id}/assign-table`)
          } else {
            // Ask if they want to send an email/SMS message
            promptToSendMessage(data.accessCode)
          }
        })
      } else {
        // Table is assigned, ask if they want to send an email/SMS message
        promptToSendMessage(data.accessCode)
        
        // Show success message
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: 'Attendee has been admitted',
          confirmButtonColor: '#10B981'
        })
      }
      
    } catch (error) {
      console.error('Error admitting attendee:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to admit attendee',
        confirmButtonColor: '#EF4444'
      })
    } finally {
      setAdmittingGate(false)
    }
  }
  
  // Function to prompt sending a message to the attendee
  const promptToSendMessage = (accessCode: any) => {
    const hasContactInfo = accessCode.rsvpEmail || accessCode.rsvpPhone
    
    if (!hasContactInfo) {
      console.log('No contact information available for this attendee')
      return
    }
    
    const tableInfo = accessCode.tableName ? `Your table number is ${accessCode.tableName}.` : ''
    
    Swal.fire({
      icon: 'question',
      title: 'Send Email/SMS Notification',
      text: `Would you like to send an email/SMS to ${accessCode.name} about their admission?`,
      showCancelButton: true,
      confirmButtonText: 'Send Message',
      cancelButtonText: 'Skip',
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33'
    }).then((result) => {
      if (result.isConfirmed) {
        sendAdmissionMessage(accessCode, tableInfo)
      }
    })
  }
  
  // Function to send an admission message to the attendee
  const sendAdmissionMessage = async (accessCode: any, tableInfo: string) => {
    try {
      // Determine which channels to use based on available contact info
      const messageType = accessCode.rsvpEmail && accessCode.rsvpPhone 
        ? 'both' 
        : accessCode.rsvpEmail 
          ? 'email' 
          : 'sms'
      
      // Create message content
      const emailSubject = `You've been admitted to ${event?.title || 'the event'}`
      const messageContent = `Hello ${accessCode.name},\n\nYou have been successfully admitted to ${event?.title || 'the event'}. ${tableInfo}\n\nEnjoy the event!`
      
      // WhatsApp message with emoji and formatting
      const whatsappMessage = `✅ *Gate Admission Confirmation* ✅\n\nHello *${accessCode.name}*,\n\nYou have been successfully admitted to *${event?.title || 'the event'}*.\n\n${tableInfo ? `🪑 *Table Information:* ${tableInfo}\n\n` : ''}\nWelcome and enjoy the event! 🎉\n\n_Sent via Greenvites_`
      
      // Send the message
      const response = await fetch('/api/admin/rsvps/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          rsvpIds: [accessCode.rsvpId],
          messageType,
          emailSubject,
          emailMessage: messageContent,
          smsMessage: messageContent,
          includeRegistrationCode: false
        })
      })
      
      // Also send WhatsApp message if phone is available
      if (accessCode.rsvpPhone) {
        try {
          const whatsappResponse = await fetch('/api/admin/whatsapp', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              phone: accessCode.rsvpPhone,
              message: whatsappMessage,
              eventId: eventId
            })
          })
          
          if (!whatsappResponse.ok) {
            console.error('Failed to send WhatsApp message:', await whatsappResponse.text())
          } else {
            console.log('WhatsApp message sent successfully')
          }
        } catch (whatsappError) {
          console.error('Error sending WhatsApp message:', whatsappError)
          // Continue execution even if WhatsApp fails
        }
      }
      
      if (!response.ok) {
        throw new Error('Failed to send message')
      }
      
      const result = await response.json()
      console.log('Admission message sending result:', result)
      
      Swal.fire({
        icon: 'success',
        title: 'Message Sent',
        text: 'Admission notification has been sent to the attendee',
        confirmButtonColor: '#10B981'
      })
      
    } catch (error) {
      console.error('Error sending admission message:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to send admission notification',
        confirmButtonColor: '#EF4444'
      })
    }
  }
  
  // Handle hall admission
  const handleHallAdmit = async () => {
    try {
      if (!attendee) return
      
      setAdmittingHall(true)
      
      const response = await fetch(`/api/admin/events/${eventId}/access-codes/admit-hall`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ codeId: attendee.id })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        
        // If the guest hasn't been admitted at the gate yet
        if (errorData.requiresGateAdmission) {
          Swal.fire({
            icon: 'warning',
            title: 'Gate Admission Required',
            text: 'Attendee must be admitted at the gate first',
            confirmButtonText: 'Admit at Gate',
            showCancelButton: true,
            confirmButtonColor: '#10B981',
            cancelButtonColor: '#9CA3AF'
          }).then((result) => {
            if (result.isConfirmed) {
              handleGateAdmit()
            }
          })
          return
        }
        
        throw new Error(errorData.error || 'Failed to admit attendee to hall')
      }
      
      const data = await response.json()
      
      // Log the response data to confirm successful update
      console.log('Hall admission API response:', data)
      
      // Update the attendee object with hall admission data
      if (attendee) {
        setAttendee({
          ...attendee,
          isHallAdmitted: true,
          hallAdmittedAt: new Date().toISOString(),
          tableId: data.accessCode.tableId,
          tableName: data.accessCode.tableName
        });
        
        // Log the updated attendee object
        console.log('Updated attendee object:', {
          id: attendee.id,
          name: attendee.name,
          isHallAdmitted: true,
          hallAdmittedAt: new Date().toISOString(),
          tableId: data.accessCode.tableId,
          tableName: data.accessCode.tableName
        });
      }
      
      // Prepare table info for messaging
      const tableInfo = data.accessCode.tableName ? `Your table number is ${data.accessCode.tableName}.` : ''
      
      // Automatically send WhatsApp message if phone is available
      if (data.accessCode.rsvpPhone) {
        try {
          // WhatsApp message with emoji and formatting
          const whatsappMessage = `🎉 *Hall Admission Confirmation* 🎉\n\nHello *${data.accessCode.name}*,\n\nYou have been successfully admitted to the hall at *${event?.title || 'the event'}*.\n\n${tableInfo ? `🪑 *Table Information:* ${tableInfo}\n\n` : ''}\nEnjoy the event! 🥂\n\n_Sent via Greenvites_`
          
          console.log('Sending WhatsApp message for hall admission...')
          
          const whatsappResponse = await fetch('/api/admin/whatsapp', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              phone: data.accessCode.rsvpPhone,
              message: whatsappMessage,
              eventId: eventId
            })
          })
          
          if (!whatsappResponse.ok) {
            console.error('Failed to send WhatsApp message:', await whatsappResponse.text())
          } else {
            console.log('WhatsApp message sent successfully for hall admission')
          }
        } catch (whatsappError) {
          console.error('Error sending WhatsApp message for hall admission:', whatsappError)
          // Continue execution even if WhatsApp fails
        }
      } else {
        console.log('No phone number available for WhatsApp message')
      }
      
      // Check if a table is assigned
      if (!data.hasTable) {
        // Prompt to assign a table
        Swal.fire({
          icon: 'warning',
          title: 'No Table Assigned',
          text: 'Would you like to assign a table for this attendee?',
          showCancelButton: true,
          confirmButtonText: 'Assign Table',
          cancelButtonText: 'Skip',
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#d33'
        }).then((result) => {
          if (result.isConfirmed) {
            // Redirect to the table assignment page
            router.push(`/admin/dashboard/events/${eventId}/access-codes/${attendee.id}/assign-table`)
          } else {
            // Ask if they want to send an email/SMS message
            promptToSendHallAdmissionMessage(data.accessCode)
          }
        })
      } else {
        // Table is assigned, ask if they want to send an email/SMS message
        promptToSendHallAdmissionMessage(data.accessCode)
        
        // Show success message
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: 'Attendee has been admitted to the hall',
          confirmButtonColor: '#10B981'
        })
      }
      
    } catch (error) {
      console.error('Error admitting attendee to hall:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to admit attendee to hall',
        confirmButtonColor: '#EF4444'
      })
    } finally {
      setAdmittingHall(false)
    }
  }
  
  // Function to prompt sending a hall admission message to the attendee
  const promptToSendHallAdmissionMessage = (accessCode: any) => {
    const hasContactInfo = accessCode.rsvpEmail || accessCode.rsvpPhone
    
    if (!hasContactInfo) {
      console.log('No contact information available for this attendee')
      return
    }
    
    const tableInfo = accessCode.tableName ? `Your table number is ${accessCode.tableName}.` : ''
    
    Swal.fire({
      icon: 'question',
      title: 'Send Email/SMS Notification',
      text: `Would you like to send an email/SMS to ${accessCode.name} about their hall admission?`,
      showCancelButton: true,
      confirmButtonText: 'Send Message',
      cancelButtonText: 'Skip',
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33'
    }).then((result) => {
      if (result.isConfirmed) {
        sendHallAdmissionMessage(accessCode, tableInfo)
      }
    })
  }
  
  // Function to send a hall admission message to the attendee
  const sendHallAdmissionMessage = async (accessCode: any, tableInfo: string) => {
    try {
      // Determine which channels to use based on available contact info
      const messageType = accessCode.rsvpEmail && accessCode.rsvpPhone 
        ? 'both' 
        : accessCode.rsvpEmail 
          ? 'email' 
          : 'sms'
      
      // Create message content
      const emailSubject = `You've been admitted to the hall at ${event?.title || 'the event'}`
      const messageContent = `Hello ${accessCode.name},\n\nYou have been successfully admitted to the hall at ${event?.title || 'the event'}. ${tableInfo}\n\nEnjoy the event!`
      
      // WhatsApp message with emoji and formatting
      const whatsappMessage = `🎉 *Hall Admission Confirmation* 🎉\n\nHello *${accessCode.name}*,\n\nYou have been successfully admitted to the hall at *${event?.title || 'the event'}*.\n\n${tableInfo ? `🪑 *Table Information:* ${tableInfo}\n\n` : ''}\nEnjoy the event! 🥂\n\n_Sent via Greenvites_`
      
      // Send the message
      const response = await fetch('/api/admin/rsvps/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          rsvpIds: [accessCode.rsvpId],
          messageType,
          emailSubject,
          emailMessage: messageContent,
          smsMessage: messageContent,
          includeRegistrationCode: false
        })
      })
      
      // Also send WhatsApp message if phone is available
      if (accessCode.rsvpPhone) {
        try {
          const whatsappResponse = await fetch('/api/admin/whatsapp', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              phone: accessCode.rsvpPhone,
              message: whatsappMessage,
              eventId: eventId
            })
          })
          
          if (!whatsappResponse.ok) {
            console.error('Failed to send WhatsApp message:', await whatsappResponse.text())
          } else {
            console.log('WhatsApp message sent successfully')
          }
        } catch (whatsappError) {
          console.error('Error sending WhatsApp message:', whatsappError)
          // Continue execution even if WhatsApp fails
        }
      }
      
      if (!response.ok) {
        throw new Error('Failed to send message')
      }
      
      const result = await response.json()
      console.log('Hall admission message sending result:', result)
      
      Swal.fire({
        icon: 'success',
        title: 'Message Sent',
        text: 'Hall admission notification has been sent to the attendee',
        confirmButtonColor: '#10B981'
      })
      
    } catch (error) {
      console.error('Error sending hall admission message:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to send hall admission notification',
        confirmButtonColor: '#EF4444'
      })
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-100 px-4 py-6 sm:px-6">
      {loading ? (
        <div className="flex justify-center items-center min-h-[80vh]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-emerald-500 mx-auto mb-4" />
            <p className="text-lg text-gray-600">Loading attendee details...</p>
          </div>
        </div>
      ) : attendee ? (
        <div className="max-w-lg mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col items-center mb-6">
            <Link href={`/admin/dashboard/events/${eventId}/access-codes`} className="text-blue-600 hover:text-blue-800 flex items-center self-start mb-4">
              <ChevronLeft className="h-5 w-5 mr-1" />
              Back to Access Codes
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">{event?.title || 'Event'}</h1>
            <p className="text-gray-500 text-center mt-1">Attendee Details</p>
          </div>
          
          {/* Attendee Card */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-emerald-500 p-4">
              <h2 className="text-xl font-semibold text-white text-center">
                {attendee.name}
              </h2>
            </div>
            
            <div className="p-6">
              {/* Already Admitted Alert */}
              {attendee.attended && (
                <div className="mb-6 bg-amber-50 border-l-4 border-amber-500 p-4 rounded-md">
                  <div className="flex items-center">
                    <CheckCircle className="h-6 w-6 text-amber-500 mr-2 flex-shrink-0" />
                    <div>
                      <p className="text-lg font-bold text-amber-700">Already Admitted</p>
                      <p className="text-amber-600">
                        This person was admitted at {attendee.attendedAt ? new Date(attendee.attendedAt).toLocaleString() : 'an earlier time'}.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Already Admitted to Hall Alert */}
              {attendee.isHallAdmitted && (
                <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-md">
                  <div className="flex items-center">
                    <CheckCircle className="h-6 w-6 text-blue-500 mr-2 flex-shrink-0" />
                    <div>
                      <p className="text-lg font-bold text-blue-700">Already Admitted to Hall</p>
                      <p className="text-blue-600">
                        This person was admitted to the hall at {attendee.hallAdmittedAt ? new Date(attendee.hallAdmittedAt).toLocaleString() : 'an earlier time'}.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Status Badges */}
              <div className="flex flex-wrap justify-center gap-2 mb-6">
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  attendee.attended ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {attendee.attended ? 'Admitted at Gate' : 'Not Admitted'}
                </div>
                
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  attendee.isHallAdmitted ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {attendee.isHallAdmitted ? 'Admitted to Hall' : 'Not in Hall'}
                </div>
                
                {attendee.tableId && (
                  <div className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                    Table: {attendee.tableName || 'Assigned'}
                  </div>
                )}
              </div>
              
              {/* Attendee Details */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="border rounded-md p-3 bg-gray-50">
                    <p className="text-sm font-medium text-gray-500">Code</p>
                    <p className="text-lg font-semibold">{attendee.code}</p>
                  </div>
                  
                  {attendee.email && (
                    <div className="border rounded-md p-3 bg-gray-50">
                      <p className="text-sm font-medium text-gray-500">Email</p>
                      <p className="text-base break-all">{attendee.email}</p>
                    </div>
                  )}
                  
                  {attendee.phone && (
                    <div className="border rounded-md p-3 bg-gray-50">
                      <p className="text-sm font-medium text-gray-500">Phone</p>
                      <p className="text-base">{attendee.phone}</p>
                    </div>
                  )}
                  
                  {attendee.tableName && (
                    <div className="border rounded-md p-3 bg-gray-50">
                      <p className="text-sm font-medium text-gray-500">Table</p>
                      <p className="text-base">{attendee.tableName}</p>
                    </div>
                  )}
                  
                  {attendee.attended && attendee.attendedAt && (
                    <div className="border rounded-md p-3 bg-gray-50">
                      <p className="text-sm font-medium text-gray-500">Admitted At</p>
                      <p className="text-base">
                        {new Date(attendee.attendedAt).toLocaleString()}
                      </p>
                    </div>
                  )}
                  
                  {attendee.isHallAdmitted && attendee.hallAdmittedAt && (
                    <div className="border rounded-md p-3 bg-gray-50">
                      <p className="text-sm font-medium text-gray-500">Hall Admitted At</p>
                      <p className="text-base">
                        {new Date(attendee.hallAdmittedAt).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="mt-8 flex flex-col gap-3">
                {!attendee.attended && (
                  <button
                    onClick={handleGateAdmit}
                    disabled={admittingGate}
                    className="w-full px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {admittingGate ? (
                      <>
                        <Loader2 className="inline-block h-5 w-5 mr-2 animate-spin" />
                        Admitting at Gate...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="inline-block h-5 w-5 mr-2" />
                        Admit at Gate
                      </>
                    )}
                  </button>
                )}
                
                {!attendee.isHallAdmitted && (
                  <button
                    onClick={handleHallAdmit}
                    disabled={admittingHall || !attendee.attended}
                    className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {admittingHall ? (
                      <>
                        <Loader2 className="inline-block h-5 w-5 mr-2 animate-spin" />
                        Admitting to Hall...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="inline-block h-5 w-5 mr-2" />
                        Admit to Hall
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
          
          {/* Associated Attendees Card */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-blue-500 p-4">
              <div className="flex items-center justify-center">
                <Users className="h-5 w-5 text-white mr-2" />
                <h3 className="text-lg font-semibold text-white">Associated Attendees</h3>
              </div>
            </div>
            
            <div className="p-4">
              {associatedAttendees.length > 0 ? (
                <div className="space-y-3">
                  {associatedAttendees.map(associate => (
                    <div key={associate.id} className="border rounded-md p-3 hover:bg-gray-50">
                      <Link href={`/admin/dashboard/events/${eventId}/qr/${associate.code}`}>
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                          <div>
                            <div className="font-medium">
                              {associate.cleanName}
                              {associate.relationshipType && (
                                <span className="ml-1 text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                                  {associate.relationshipType}
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">Code: {associate.code}</div>
                            
                            {/* Guest, Driver, Aide Badges */}
                            <div className="flex flex-wrap gap-1 mt-1">
                              {associate.hasGuest && (
                                <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full">
                                  +Guest
                                </span>
                              )}
                              {associate.hasDriver && (
                                <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full">
                                  +Driver
                                </span>
                              )}
                              {associate.hasAide && (
                                <span className="text-xs px-2 py-0.5 bg-pink-100 text-pink-800 rounded-full">
                                  +Aide
                                </span>
                              )}
                            </div>
                          </div>
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                            associate.attended ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {associate.attended ? 'Admitted' : 'Not Admitted'}
                          </div>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <p>No associated attendees found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-lg mx-auto text-center py-12">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Attendee Not Found</h2>
          <p className="text-gray-600 mb-6">
            We couldn't find an attendee with the provided code. Please check the code and try again.
          </p>
          <Link
            href={`/admin/dashboard/events/${eventId}/access-codes`}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Access Codes
          </Link>
        </div>
      )}
    </div>
  )
}
