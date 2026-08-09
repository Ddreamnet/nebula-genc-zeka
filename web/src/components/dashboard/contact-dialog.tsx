"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/panel-ui/dialog";
import { Card, CardContent } from "@/components/panel-ui/card";
import { Mail, Phone } from "lucide-react";
import { siteConfig, whatsappHref } from "@/lib/site";
import { InstagramIcon, WhatsappIcon } from "@/components/ui/brand-icons";

export function ContactDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="pn-btn pn-btn--sm pn-btn--navy">
          <Phone className="h-4 w-4" />
          <span className="hidden sm:inline">İletişim</span>
        </button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100%-1rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>İletişim Bilgileri</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <WhatsappIcon className="h-5 w-5 shrink-0 text-[#25D366]" />
                <div>
                  <p className="font-medium">WhatsApp</p>
                  <a href={whatsappHref()} target="_blank" rel="noreferrer" className="text-sm text-[#25D366] hover:underline">
                    +90 546 280 48 36
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <InstagramIcon className="h-5 w-5 shrink-0 text-[#FF0069]" />
                <div>
                  <p className="font-medium">Instagram</p>
                  <a href={siteConfig.instagram} target="_blank" rel="noreferrer" className="text-sm text-[#FF0069] hover:underline">
                    @nebulagenczeka
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">E-posta</p>
                  <a href={`mailto:${siteConfig.email}`} className="text-sm text-primary hover:underline">
                    {siteConfig.email}
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
