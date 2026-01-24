'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ITEM_CATEGORIES } from '@/lib/constants';
import { Calendar as CalendarIcon, Loader2, MapPin } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import ImageUploader from './image-uploader';
import { Checkbox } from '@/components/ui/checkbox';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ReportSchema } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { type User, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

interface ItemReportFormProps {
  type: 'lost' | 'found';
  title: string;
  description: string;
}

export default function ItemReportForm({
  type,
  title,
  description,
}: ItemReportFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsAuthLoading(false);
      if (!user) {
        toast({
          variant: 'destructive',
          title: 'Authentication Required',
          description: 'You must be logged in to report an item.',
        });
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [router, toast]);

  const form = useForm<z.infer<typeof ReportSchema>>({
    resolver: zodResolver(ReportSchema),
    defaultValues: {
      type: type,
      description: '',
      location: '',
      name: '',
      contact: '',
      imageUrl: undefined,
      agreedToTerms: false,
    },
  });

  async function handleGetCurrentLocation() {
    if (!navigator.geolocation) {
      toast({
        variant: 'destructive',
        title: 'Geolocation not supported',
        description: 'Your browser does not support geolocation.',
      });
      return;
    }

    setIsFetchingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
          );
          if (!response.ok) {
            throw new Error('Failed to fetch address from geocoding service.');
          }
          const data = await response.json();
          if (data && data.display_name) {
            form.setValue('location', data.display_name, { shouldValidate: true });
            toast({
              title: 'Location set!',
              description: 'Your current location has been filled in.',
            });
          } else {
            throw new Error('Could not determine a valid address from the coordinates.');
          }
        } catch (error) {
          console.error('Reverse geocoding failed:', error);
          toast({
            variant: 'destructive',
            title: 'Could not get address',
            description: 'Please enter your location manually.',
          });
        } finally {
          setIsFetchingLocation(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        let description = 'An unknown error occurred.';
        if (error.code === error.PERMISSION_DENIED) {
            description = 'Please enable location permissions in your browser and try again.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
            description = 'Location information is unavailable.';
        }
        toast({
          variant: 'destructive',
          title: 'Geolocation failed',
          description: description,
        });
        setIsFetchingLocation(false);
      }
    );
  }

  async function onSubmit(values: z.infer<typeof ReportSchema>) {
    if (isAuthLoading) {
      toast({
        variant: 'destructive',
        title: 'Please wait',
        description: 'Authentication is still loading.',
      });
      return;
    }

    if (!user || !user.uid) {
      toast({
        variant: 'destructive',
        title: 'Authentication Required',
        description:
          'You must be logged in to submit a report. Please log in and try again.',
      });
      router.push('/login');
      return;
    }

    setIsSubmitting(true);
    try {
      // Logic moved from server action to client side to ensure auth context.
      const { agreedToTerms, ...reportValues } = values;

      const reportData: { [key: string]: any } = {
        ...reportValues,
        userId: user.uid,
        status: 'open',
        category: values.category.toLowerCase().trim(),
        createdAt: serverTimestamp(),
      };

      // Remove undefined fields before sending to Firestore
      Object.keys(reportData).forEach((key) => {
        if (reportData[key] === undefined) {
          delete reportData[key];
        }
      });

      const itemsCollection = collection(db, 'items');
      const docRef = await addDoc(itemsCollection, reportData);

      toast({
        title: 'Report Submitted Successfully!',
        description:
          type === 'lost'
            ? 'We are now searching for matches...'
            : 'Thank you for your report.',
      });
      form.reset();

      if (type === 'lost') {
        router.push(`/report/lost/${docRef.id}/matches`);
      } else {
        router.push('/dashboard');
      }
    } catch (error: any) {
        console.error("Error submitting report from client:", error);
        toast({
            variant: 'destructive',
            title: 'Submission Failed',
            description: error.message || 'An unknown error occurred. Please check security rules.',
        });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isAuthLoading) {
    return (
        <div className="flex items-center justify-center min-h-[50vh]">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </div>
    )
  }

  return (
    <Card className="w-full max-w-2xl shadow-2xl">
      <CardHeader>
        <CardTitle className="text-3xl font-headline">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item Category *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ITEM_CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>
                      Date {type === 'lost' ? 'Lost' : 'Found'} *
                    </FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={'outline'}
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP')
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="w-4 h-4 ml-auto opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date('1900-01-01')
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Black leather wallet with a gold zipper, containing a driver's license and two credit cards."
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Be as specific as possible. Include color, brand, size, and
                    any unique features.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Location {type === 'lost' ? 'Lost' : 'Found'} *
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Central Park, near the carousel"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 flex items-center"
                    onClick={handleGetCurrentLocation}
                    disabled={isFetchingLocation}
                  >
                    {isFetchingLocation ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Fetching Location...
                      </>
                    ) : (
                      <>
                        <MapPin className="w-4 h-4 mr-2" />
                        Use my current location
                      </>
                    )}
                  </Button>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image (Optional)</FormLabel>
                  <FormControl>
                    <ImageUploader
                      onUploadComplete={(url, path) => {
                        form.setValue('imageUrl', url);
                        form.setValue('imagePath', path);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    A clear picture can significantly improve match accuracy.
                    Max 5MB.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Email or Phone *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="john.doe@example.com or 555-123-4567"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="agreedToTerms"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm bg-background">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Acknowledge and Agree *</FormLabel>
                    <FormDescription>
                      I understand that the information I provide, including my
                      contact details, will be made public to help match my
                      item.
                    </FormDescription>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={isAuthLoading || !user || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Report'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
