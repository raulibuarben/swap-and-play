from django.db import models
from django.conf import settings


class Trade(models.Model):
    class OfferType(models.TextChoices):
        SALE = 'SALE', 'Compra'
        TRADE = 'TRADE', 'Intercambio'

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pendiente'
        ACCEPTED = 'ACCEPTED', 'Aceptada'
        REJECTED = 'REJECTED', 'Rechazada'
        CANCELLED = 'CANCELLED', 'Cancelada'

    # 1. Partes implicadas y juego objetivo
    target_game = models.ForeignKey(
        'games.Game',
        on_delete=models.CASCADE,
        related_name='received_trades',
    )
    requester = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_trades',
    )

    # 2. Detalles de la propuesta
    offer_type = models.CharField(
        max_length=10,
        choices=OfferType.choices,
        default=OfferType.TRADE,
    )
    offered_game = models.ForeignKey(
        'games.Game',
        on_delete=models.SET_NULL,
        related_name='offered_in_trades',
        blank=True,
        null=True,
    )
    offered_price = models.DecimalField(
        max_digits=7,
        decimal_places=2,
        blank=True,
        null=True,
    )
    message = models.TextField(max_length=400, blank=True)

    # 3. Estado y fecha
    status = models.CharField(
        max_length=12,
        choices=Status.choices,
        default=Status.PENDING,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.requester.username} -> {self.target_game.title} ({self.get_status_display()})'