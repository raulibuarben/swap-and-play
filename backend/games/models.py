from django.conf import settings
from django.db import models


class Game(models.Model):
    class Condition(models.TextChoices):
        NEW = 'NEW', 'Nuevo / Precintado'
        LIKE_NEW = 'LIKE_NEW', 'Como nuevo'
        GOOD = 'GOOD', 'Bueno'
        ACCEPTABLE = 'ACCEPTABLE', 'Aceptable'

    class OperationType(models.TextChoices):
        SALE = 'SALE', 'Venta'
        TRADE = 'TRADE', 'Intercambio'
        BOTH = 'BOTH', 'Venta o intercambio'

    # Información básica del juego
    title = models.CharField(max_length=150)
    platform = models.CharField(max_length=80)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='games',
    )

    # Detalles del anuncio y operación
    description = models.TextField(max_length=600, blank=True)
    cover = models.ImageField(upload_to='games/covers/', blank=True, null=True)
    condition = models.CharField(
        max_length=20,
        choices=Condition.choices,
        default=Condition.GOOD,
    )
    operation_type = models.CharField(
        max_length=10,
        choices=OperationType.choices,
        default=OperationType.BOTH,
    )
    price = models.DecimalField(
        max_digits=7,
        decimal_places=2,
        blank=True,
        null=True,
    )

    # Control de inventario y disponibilidad
    is_available = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.title} ({self.platform})'