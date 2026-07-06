import React from "react";
import { useGuild } from "@/lib/guild-context";
import {
  useGetGuildConfig,
  useUpdateGuildConfig,
  getGetGuildConfigQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ModulePage, FormSection } from "@/components/module-page";
import { Handshake, Save, Loader2 } from "lucide-react";

export default function Partnership() {
  const { selectedGuildId } = useGuild();
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useGetGuildConfig(selectedGuildId || "", {
    query: { enabled: !!selectedGuildId, queryKey: getGetGuildConfigQueryKey(selectedGuildId || "") },
  });

  const mutation = useUpdateGuildConfig();

  const form = useForm({
    defaultValues: {
      partnerEnabled: false,
      partnerChannel: "",
      partnerResponsibleRole: "",
      partnerPingRole: "",
      partnerRole: "",
      partnerNotifyDm: false,
      partnerMessage: "",
      partnerImage: "",
      partnerThumbnail: "",
      partnerFooter: "",
      partnerColor: "#7c3aed",
      partnerRemoveOnLeave: false,
    },
  });

  React.useEffect(() => {
    if (config) {
      form.reset({
        partnerEnabled: config.partnerEnabled ?? false,
        partnerChannel: config.partnerChannel ?? "",
        partnerResponsibleRole: config.partnerResponsibleRole ?? "",
        partnerPingRole: config.partnerPingRole ?? "",
        partnerRole: config.partnerRole ?? "",
        partnerNotifyDm: config.partnerNotifyDm ?? false,
        partnerMessage: config.partnerMessage ?? "",
        partnerImage: config.partnerImage ?? "",
        partnerThumbnail: config.partnerThumbnail ?? "",
        partnerFooter: config.partnerFooter ?? "",
        partnerColor: config.partnerColor ?? "#7c3aed",
        partnerRemoveOnLeave: config.partnerRemoveOnLeave ?? false,
      });
    }
  }, [config]);

  const onSubmit = (data: ReturnType<typeof form.getValues>) => {
    if (!selectedGuildId) return;
    mutation.mutate(
      { guildId: selectedGuildId, data },
      {
        onSuccess: () => {
          toast.success("Parcerias atualizado com sucesso!");
          queryClient.invalidateQueries({ queryKey: getGetGuildConfigQueryKey(selectedGuildId) });
        },
        onError: () => toast.error("Erro ao salvar. Tente novamente."),
      }
    );
  };

  return (
    <ModulePage
      title="Sistema de Parcerias"
      description="Configure o modulo automatico de parcerias com outros servidores."
      icon={<Handshake className="w-6 h-6" />}
      isLoading={isLoading && !!selectedGuildId}
      noGuildSelected={!selectedGuildId}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormSection title="Status">
            <FormField control={form.control} name="partnerEnabled" render={({ field }) => (
              <FormItem className="flex items-center justify-between">
                <div><FormLabel>Modulo Ativo</FormLabel><FormDescription>Ativa ou desativa o sistema de parcerias</FormDescription></div>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-partner-enabled" /></FormControl>
              </FormItem>
            )} />
          </FormSection>

          <FormSection title="Canais e Cargos">
            <FormField control={form.control} name="partnerChannel" render={({ field }) => (
              <FormItem>
                <FormLabel>ID do Canal de Parcerias</FormLabel>
                <FormControl><Input placeholder="000000000000000000" {...field} value={field.value ?? ""} data-testid="input-partner-channel" /></FormControl>
                <FormDescription>Canal monitorado para detectar links de parceria</FormDescription>
              </FormItem>
            )} />
            <FormField control={form.control} name="partnerResponsibleRole" render={({ field }) => (
              <FormItem>
                <FormLabel>ID do Cargo Responsavel</FormLabel>
                <FormControl><Input placeholder="000000000000000000" {...field} value={field.value ?? ""} data-testid="input-partner-responsible-role" /></FormControl>
                <FormDescription>Cargo atribuido a quem trouxer parcerias</FormDescription>
              </FormItem>
            )} />
            <FormField control={form.control} name="partnerPingRole" render={({ field }) => (
              <FormItem>
                <FormLabel>ID do Cargo para Notificar</FormLabel>
                <FormControl><Input placeholder="000000000000000000" {...field} value={field.value ?? ""} data-testid="input-partner-ping-role" /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="partnerRole" render={({ field }) => (
              <FormItem>
                <FormLabel>ID do Cargo de Parceiro</FormLabel>
                <FormControl><Input placeholder="000000000000000000" {...field} value={field.value ?? ""} data-testid="input-partner-role" /></FormControl>
                <FormDescription>Cargo concedido ao servidor parceiro</FormDescription>
              </FormItem>
            )} />
          </FormSection>

          <FormSection title="Mensagem de Parceria">
            <FormField control={form.control} name="partnerMessage" render={({ field }) => (
              <FormItem>
                <FormLabel>Mensagem</FormLabel>
                <FormControl><Textarea placeholder="Mensagem exibida na parceria..." {...field} value={field.value ?? ""} className="resize-none" rows={4} data-testid="textarea-partner-message" /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="partnerFooter" render={({ field }) => (
              <FormItem>
                <FormLabel>Rodape</FormLabel>
                <FormControl><Input placeholder="Texto do rodape..." {...field} value={field.value ?? ""} data-testid="input-partner-footer" /></FormControl>
              </FormItem>
            )} />
          </FormSection>

          <FormSection title="Aparencia">
            <FormField control={form.control} name="partnerColor" render={({ field }) => (
              <FormItem>
                <FormLabel>Cor (Hex)</FormLabel>
                <FormControl>
                  <div className="flex gap-3 items-center">
                    <input type="color" className="w-10 h-10 rounded-lg cursor-pointer border border-border bg-transparent" value={field.value ?? "#7c3aed"} onChange={(e) => field.onChange(e.target.value)} data-testid="color-partner" />
                    <Input placeholder="#7c3aed" {...field} value={field.value ?? ""} className="font-mono" data-testid="input-partner-color" />
                  </div>
                </FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="partnerImage" render={({ field }) => (
              <FormItem>
                <FormLabel>URL da Imagem</FormLabel>
                <FormControl><Input placeholder="https://..." {...field} value={field.value ?? ""} data-testid="input-partner-image" /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="partnerThumbnail" render={({ field }) => (
              <FormItem>
                <FormLabel>URL da Miniatura</FormLabel>
                <FormControl><Input placeholder="https://..." {...field} value={field.value ?? ""} data-testid="input-partner-thumbnail" /></FormControl>
              </FormItem>
            )} />
          </FormSection>

          <FormSection title="Opcoes">
            <FormField control={form.control} name="partnerNotifyDm" render={({ field }) => (
              <FormItem className="flex items-center justify-between">
                <div><FormLabel>Notificar via DM</FormLabel><FormDescription>Enviar DM ao promotor quando parceria for registrada</FormDescription></div>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-partner-notify-dm" /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="partnerRemoveOnLeave" render={({ field }) => (
              <FormItem className="flex items-center justify-between">
                <div><FormLabel>Remover ao Sair</FormLabel><FormDescription>Remover cargo de parceiro se o servidor sair</FormDescription></div>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-partner-remove-on-leave" /></FormControl>
              </FormItem>
            )} />
          </FormSection>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={mutation.isPending} className="gap-2 px-8" data-testid="button-save-partnership">
              {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar Alterações
            </Button>
          </div>
        </form>
      </Form>
    </ModulePage>
  );
}
